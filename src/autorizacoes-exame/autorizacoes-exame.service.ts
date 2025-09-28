import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import { CreateAutorizacaoExameDto } from './dto/create-autorizacoes-exame.dto';
import { UpdateAutorizacaoExameDto } from './dto/update-autorizacoes-exame.dto';
import pdf from 'pdf-parse';
import { RolProcedimentosService } from 'src/rol-procedimentos/rol-procedimentos.service';
import { StatusAutorizacao, Usuario } from '@prisma/client';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { MedicosService } from 'src/medicos/medicos.service';

type DadosExtraidos = {
  nome: string | null;
  crm: string | null;
  procedimento: string | null;
};

type DadosProcessados = DadosExtraidos & {
  detalhesProcedimentos?: any[];
};


@Injectable()
export class AutorizacoesExameService {
  constructor(
    private prisma: PrismaService,
    private readonly rolProcedimentosService: RolProcedimentosService,
    private readonly pacientesService: UsuariosService,
    private readonly medicosService: MedicosService
  ) { }
  private readonly logger = new Logger(AutorizacoesExameService.name);

  async processarPdfEExtrairDados(pdfFile: Express.Multer.File): Promise<any> {
    this.logger.log('Iniciando extração de texto do PDF...');

    try {
      const data = await pdf(pdfFile.buffer);
      const informacoesLimpas = this.extrairInformacoesEssenciais(data.text);

      let procedimentosParaCriar: any = [];
      const terminologiasComErro: any[] = [];

      if (informacoesLimpas.procedimento) {
        const listaProcedimentos = informacoesLimpas.procedimento.split('\n').filter(p => p.trim() !== '');

        this.logger.log(`Encontrados ${listaProcedimentos.length} procedimentos para buscar...`);

        // Mapeia cada procedimento para um objeto de resultado (sucesso ou erro)
        const promessasDeBusca = listaProcedimentos.map(async (proc) => {
          const terminologia = proc.trim();
          const resultadoBusca = await this.rolProcedimentosService.findByTerminologia(terminologia);

          if (resultadoBusca && resultadoBusca.length > 0) {
            // Sucesso: retorna os dados encontrados
            return { status: 'sucesso', data: resultadoBusca };
          } else {
            // Erro: retorna a terminologia e a mensagem de erro padrão
            return {
              status: 'erro',
              terminologia: terminologia,
              error: "Não encontrado na planilha de auditoria por conta de um erro de digitação",
            };
          }
        });

        const resultadosMapeados = await Promise.all(promessasDeBusca);

        // Separa os resultados em duas listas: os encontrados e os com erro
        resultadosMapeados.forEach(resultado => {
          if (resultado.status === 'sucesso') {
            procedimentosParaCriar.push(...resultado.data!);
          } else {
            terminologiasComErro.push({
              nome: resultado.terminologia,
              error: resultado.error,
            });
          }
        });
      }

      const crm = informacoesLimpas.crm!;
      const paciente = informacoesLimpas.nome!;

      const medico = await this.medicosService.findByCRM(crm);
      const pacienteEncontrado = await this.pacientesService.findByName(paciente);

      if (!pacienteEncontrado) {
        throw new Error('Paciente nao encontrado');
      }

      if (!medico) {
        throw new Error('Medico nao encontrado');
      }

      const autorizacoesCriadas: any[] = [];
      // Itera apenas sobre os procedimentos que foram encontrados com sucesso
      for (const procedimento of procedimentosParaCriar) {
        let dataLiberacao: Date | null = null;
        const hoje = new Date();

        if (procedimento.tipo === 'Sem Auditoria') {
          dataLiberacao = new Date();
        } else if (procedimento.tipo === 'Auditoria') {
          // Cria uma nova data para não modificar a referência 'hoje'
          dataLiberacao = new Date(new Date().setDate(hoje.getDate() + 5));
        } else if (procedimento.tipo === 'OPME') {
          dataLiberacao = new Date(new Date().setDate(hoje.getDate() + 10));
        }

        const novaAutorizacao = await this.prisma.autorizacaoExame.create({
          data: {
            pacienteId: pacienteEncontrado?.perfilPaciente?.id!,
            medicoId: medico?.perfilMedico?.id!,
            protocolo: randomBytes(8).toString('hex'),
            codigo: procedimento.codigo,
            exame: procedimento.terminologia,
            status: procedimento.tipo === 'Sem Auditoria'
              ? StatusAutorizacao.APROVADA
              : StatusAutorizacao.PENDENTE,
            tipo: procedimento.tipo,
            liberadoEm: dataLiberacao,
          },
        });
        autorizacoesCriadas.push(novaAutorizacao);
      }

      // Retorna um objeto com ambas as listas
      return {
        autorizacoesCriadas,
        erros: terminologiasComErro,
      };

    } catch (error) {
      this.logger.error('Erro ao processar o arquivo PDF', error.stack);
      throw new Error('Falha ao extrair texto do PDF.');
    }
  }

  private extrairInformacoesEssenciais(textoBruto: string): DadosExtraidos {
    // ... sua lógica de extração com regex continua aqui ...
    const resultado: DadosExtraidos = { nome: null, crm: null, procedimento: null };
    const regexNome = /Nome:\s*(.*)/i;
    const matchNome = textoBruto.match(regexNome);
    if (matchNome && matchNome[1]) {
      resultado.nome = matchNome[1].trim().replace(/\s+/g, " ");
    }
    const regexCrm = /CRM:\s*(\d+)/i;
    const matchCrm = textoBruto.match(regexCrm);
    if (matchCrm && matchCrm[1]) {
      resultado.crm = matchCrm[1].trim();
    }
    const linhas = textoBruto.split("\n");
    const indiceLinhaData = linhas.findIndex((linha) =>
      /Data:\s*\d{2}\/\d{2}\/\d{4}/i.test(linha)
    );
    const regexParada = /^(CRM:|Nome:|Data\s+de\s+Nascimento:|D(r|ra)?\.?\s*•?)/i;
    if (indiceLinhaData > -1) {
      const procedimentosEncontrados: string[] = [];
      for (let i = indiceLinhaData + 1; i < linhas.length; i++) {
        const linhaAtual = linhas[i].trim().replace(/[_]/g, "");
        if (regexParada.test(linhaAtual)) {
          break;
        }
        if (linhaAtual.toLowerCase() === "exames laboratoriais") {
          continue;
        }
        if (linhaAtual) {
          procedimentosEncontrados.push(linhaAtual);
        }
      }
      if (procedimentosEncontrados.length > 0) {
        resultado.procedimento = procedimentosEncontrados.join("\n");
      }
    }
    return resultado;
  }

  async findAll(userId) {
    return this.prisma.autorizacaoExame.findMany({
      select: {
        id: true,
        status: true,
        exame: true,
        tipo: true,
        criadoEm: true,
        liberadoEm: true,
        codigo: true,

        paciente: {
          select: {
            usuario: {
              select: {
                nome: true,
              },
            },
          },
        },
        medico: {
          select: {
            usuario: {
              select: {
                nome: true,
              },
            },
          },
        },
      },
      where: {
        OR: [
          { pacienteId: userId },
          { medicoId: userId },
        ],
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.autorizacaoExame.findUnique({
      where: { id },
      include: { paciente: true, medico: true, consulta: true },
    });
  }

  async update(id: string, dto: UpdateAutorizacaoExameDto) {
    return this.prisma.autorizacaoExame.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async remove(id: string) {
    return this.prisma.autorizacaoExame.delete({
      where: { id },
    });
  }
}