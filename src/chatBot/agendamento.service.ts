import { Injectable, NotFoundException } from '@nestjs/common';
import { MedicosService } from '../medicos/medicos.service';
import { ConsultasService } from '../consultas/consultas.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { addDays, format, getDay, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export enum AgendamentoStep {
    AGUARDANDO_CPF,
    AGUARDANDO_ESPECIALIDADE,
    AGUARDANDO_MEDICO,
    AGUARDANDO_DIA,
    AGUARDANDO_HORARIO,
    AGUARDANDO_CONFIRMACAO,
    CONCLUIDO,
}

export interface ConversationState {
    step: AgendamentoStep;
    cpf?: string;
    pacienteId?: string;
    especialidade?: string;
    medicosDisponiveis?: any[];
    medicoId?: string;
    medicoNome?: string;
    diasDisponiveis?: string[]; // Para guardar os dias gerados no formato YYYY-MM-DD
    diaEscolhido?: string; // Para guardar a escolha do usuário no formato YYYY-MM-DD
    dataHora?: Date;
}

@Injectable()
export class AgendamentoChatService {
    // Usamos um Map para guardar o estado de cada conversa ativa.
    // A chave é o sessionId, e o valor é o estado daquela conversa.
    // Em produção, isso poderia ser substituído por um cache como Redis.
    private conversationState = new Map<string, ConversationState>();

    constructor(
        private readonly medicosService: MedicosService,
        private readonly consultasService: ConsultasService,
        private readonly usuarioService: UsuariosService,
    ) { }

    async processarAgendamento(
        dto: ChatRequestDto,
    ): Promise<{ resposta: string }> {
        const { sessionId, pergunta } = dto;

        let currentState = this.conversationState.get(sessionId);

        if (!currentState) {
            currentState = { step: AgendamentoStep.AGUARDANDO_CPF };
            this.conversationState.set(sessionId, currentState);
        }

        let resposta: string;

        switch (currentState.step) {
            case AgendamentoStep.AGUARDANDO_CPF:
                resposta = await this.handleCpfStep(currentState, pergunta);
                break;

            case AgendamentoStep.AGUARDANDO_ESPECIALIDADE:
                resposta = await this.handleEspecialidadeStep(currentState, pergunta);
                break;

            case AgendamentoStep.AGUARDANDO_DIA:
                resposta = await this.handleDiaStep(currentState, pergunta);
                break;

            case AgendamentoStep.AGUARDANDO_MEDICO:
                resposta = await this.handleMedicoStep(currentState, pergunta);
                break;

            case AgendamentoStep.AGUARDANDO_HORARIO:
                // Lógica para lidar com a escolha do horário
                resposta = await this.handleHorarioStep(currentState, pergunta);
                break;

            case AgendamentoStep.AGUARDANDO_CONFIRMACAO:
                resposta = await this.handleConfirmacaoStep(currentState, pergunta, sessionId);
                break;

            default:
                resposta = 'Não consigo te ajudar com essa pergunta. Sou um assistente focado em telemedicina. Por favor, digite uma pergunta mais clara.';
                this.conversationState.delete(sessionId);
                break;
        }

        // Atualiza o estado da sessão
        this.conversationState.set(sessionId, currentState);

        return { resposta };
    }

    // --- Funções Auxiliares para cada Passo ---

    private async handleCpfStep(state: ConversationState, cpf: string): Promise<string> {
        const usuario = await this.usuarioService.findByDocumento(cpf);

        if (!usuario || !usuario.perfilPaciente) {
            return 'CPF não encontrado ou inválido. Por favor, digite seu CPF novamente.';
        }

        state.cpf = cpf;
        state.pacienteId = usuario.perfilPaciente.id;
        state.step = AgendamentoStep.AGUARDANDO_ESPECIALIDADE; // Avança para o próximo passo

        return 'Ótimo! CPF validado. Agora, por favor, informe a especialidade médica que você deseja (ex: Cardiologia).';
    }

    private async handleDiaStep(state: ConversationState, diaEscolhido: string): Promise<string> {
        // Converte a entrada do usuário (DD/MM/YYYY) para o formato ISO (YYYY-MM-DD) para validação
        let diaIso: string;
        try {
            const dataObj = parse(diaEscolhido, 'dd/MM/yyyy', new Date());
            diaIso = format(dataObj, 'yyyy-MM-dd');
        } catch (error) {
            return "Formato de data inválido. Por favor, digite no formato DD/MM/YYYY.";
        }

        // Valida se o dia escolhido está na lista de dias que oferecemos
        if (!state.diasDisponiveis?.includes(diaIso)) {
            return "Data indisponível. Por favor, escolha uma das datas da lista.";
        }

        state.diaEscolhido = diaIso; // Salva o dia no formato YYYY-MM-DD

        // LÓGICA REAL: Aqui você buscaria as consultas já marcadas para este médico neste dia.
        // const consultasDoDia = await this.consultasService.findByMedicoAndData(state.medicoId, diaIso);
        // const horariosOcupados = consultasDoDia.map(c => format(c.dataHoraInicio, 'HH:mm'));
        const horariosOcupados = ["10:00", "11:00"]; // Simulação de horários já agendados

        const todosHorarios = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00"];
        const horariosLivres = todosHorarios.filter(h => !horariosOcupados.includes(h));

        if (horariosLivres.length === 0) {
            state.step = AgendamentoStep.AGUARDANDO_DIA; // Volta um passo
            return "Não há mais horários disponíveis para este dia. Por favor, escolha outra data.";
        }

        state.step = AgendamentoStep.AGUARDANDO_HORARIO;

        return `Para o dia ${diaEscolhido}, temos os seguintes horários livres:\n- ${horariosLivres.join('\n- ')}\n\nQual horário você prefere?`;
    }

    private async handleEspecialidadeStep(state: ConversationState, especialidade: string): Promise<string> {
        console.log('state', state, 'especialidade', especialidade);
        const medicos = await this.medicosService.findByEspecialidade(especialidade);
        console.log('medicos', medicos);

        if (!medicos || medicos.length === 0) {
            return `Não encontrei médicos para a especialidade "${especialidade}". Por favor, tente outra.`;
        }

        state.especialidade = especialidade;
        state.medicosDisponiveis = medicos; // Salva a lista para validar a escolha
        state.step = AgendamentoStep.AGUARDANDO_MEDICO;

        const listaMedicos = medicos
            .map((medico, index) => `${index + 1}. Dr(a). ${medico.nome}`)
            .join('\n');

        return `Encontrei os seguintes especialistas:\n${listaMedicos}\n\nPor favor, digite o número ou o nome completo do médico que você escolhe.`;
    }

    private async handleMedicoStep(state: ConversationState, escolha: string): Promise<string> {
        const medicos = state?.medicosDisponiveis!;
        let medicoEscolhido: { id: string; nome: string, perfilMedico: { id: string } } | undefined = undefined;

        // Tenta encontrar pelo número
        const index = parseInt(escolha, 10) - 1;
        if (!isNaN(index) && medicos[index]) {
            medicoEscolhido = medicos[index];
        } else {
            // Tenta encontrar pelo nome
            medicoEscolhido = medicos.find(m => m.nome.toLowerCase().includes(escolha.toLowerCase()));
        }

        if (!medicoEscolhido) {
            return "Opção inválida. Por favor, digite o número ou o nome de um dos médicos da lista.";
        }

        state.medicoId = medicoEscolhido.perfilMedico.id;
        state.medicoNome = medicoEscolhido?.nome;

        const diasDisponiveis = this.gerarDiasDisponiveis(30);
        state.diasDisponiveis = diasDisponiveis.map(d => d.iso);

        state.step = AgendamentoStep.AGUARDANDO_DIA;
        const listaDeDias = diasDisponiveis.map(d => `- ${d.display}`).join('\n');


        return `Excelente escolha! Para o Dr(a). ${medicoEscolhido.nome}, temos as seguintes datas disponíveis:\n${listaDeDias}\n\nPor favor, digite a data escolhida (ex: 28/09/2025).`;
    }

    private async handleHorarioStep(state: ConversationState, horario: string): Promise<string> {
        if (!/^\d{2}:\d{2}$/.test(horario)) {
            return "Formato de horário inválido. Por favor, digite o horário no formato HH:mm (ex: 09:00).";
        }

        // Combina o dia escolhido (YYYY-MM-DD) com o horário (HH:mm)
        const dataCompletaStr = `${state.diaEscolhido}T${horario}:00`;
        const dataFinal = new Date(dataCompletaStr);

        state.dataHora = dataFinal;
        state.step = AgendamentoStep.AGUARDANDO_CONFIRMACAO;

        const dataFormatada = format(dataFinal, 'dd/MM/yyyy', { locale: ptBR });

        return `Vamos confirmar seu agendamento:\n
- Paciente CPF: ${state.cpf}
- Médico: Dr(a). ${state.medicoNome}
- Especialidade: ${state.especialidade}
- Data e Hora: ${dataFormatada} às ${horario}

Tudo certo? (Responda "sim" para confirmar)`;
    }

    private async handleConfirmacaoStep(state: ConversationState, confirmacao: string, sessionId: string): Promise<string> {
        if (confirmacao.toLowerCase() !== 'sim') {
            this.conversationState.delete(sessionId); // Limpa a sessão
            return "Agendamento cancelado. Se precisar de algo mais, é só chamar!";
        }

        try {
            await this.consultasService.create({
                dataHoraInicio: state?.dataHora?.toISOString()!,
                pacienteId: state?.pacienteId!,
                medicoId: state?.medicoId!,
            });

            this.conversationState.delete(sessionId); // Limpa a sessão após sucesso
            return "Perfeito! Sua consulta foi agendada com sucesso. Obrigado!";

        } catch (error) {
            console.error("Erro ao criar consulta:", error);
            this.conversationState.delete(sessionId);
            return "Ocorreu um erro ao tentar agendar sua consulta. Por favor, tente novamente mais tarde.";
        }
    }

    private gerarDiasDisponiveis(diasParaFrente: number): { display: string, iso: string }[] {
        const diasDisponiveis: { display: string, iso: string }[] = [];

        let diaAtual = new Date();

        while (diasDisponiveis.length < diasParaFrente) {
            const diaDaSemana = getDay(diaAtual);

            if (diaDaSemana !== 5 && diaDaSemana !== 6 && diaDaSemana !== 0) {
                diasDisponiveis.push({
                    display: format(diaAtual, 'dd/MM/yyyy (EEEE)', { locale: ptBR }),
                    iso: format(diaAtual, 'yyyy-MM-dd')
                });
            }

            diaAtual = addDays(diaAtual, 1);
        }

        return diasDisponiveis.slice(0, diasParaFrente);
    }
}