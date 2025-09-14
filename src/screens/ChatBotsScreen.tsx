import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  Image,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from './ChatBotsScreen.styles';

// Definir los tipos de navegación con TODAS tus pantallas
type RootStackParamList = {
  Welcome: undefined;
  Todo: undefined;
  Daily: undefined;
  General: undefined;
  Preventive: undefined;
  Emergency: undefined;
  Profile: undefined;
  Route: undefined;
  Agenda: undefined;
  ChatBotsScreen: undefined;
  IAScreen: undefined;
};

type ChatBotsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ChatBotsScreen'>;

// Tipos para los mensajes del chat
type MessageType = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'action';
};

// Tipo para el historial de la aplicación
type AppHistoryItem = {
  id: string;
  action: string;
  screen: string;
  data: any;
  timestamp: Date;
};

// Tipo para el estado de cada pantalla
type ScreenState = {
  Daily: any;
  General: any;
  Preventive: any;
  Emergency: any;
  Profile: any;
  Route: any;
  Agenda: any;
};

// AGENTE INTELIGENTE MEJORADO CON ANÁLISIS CONTEXTUAL
class IntelligentAgent {
  private conversationHistory: MessageType[] = [];
  private appHistory: AppHistoryItem[] = [];
  private screenStates: Partial<ScreenState> = {};
  private isListening: boolean = false;
  private recording: Audio.Recording | null = null;

  constructor() {
    this.loadHistory();
    this.loadScreenStates();
  }

  // Cargar historial desde AsyncStorage
  async loadHistory() {
    try {
      const savedHistory = await AsyncStorage.getItem('@app_history');
      if (savedHistory) {
        this.appHistory = JSON.parse(savedHistory).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  }

  // Cargar estados de pantallas
  async loadScreenStates() {
    try {
      const savedStates = await AsyncStorage.getItem('@screen_states');
      if (savedStates) {
        this.screenStates = JSON.parse(savedStates);
      }
    } catch (error) {
      console.error('Error loading screen states:', error);
    }
  }

  // Guardar estado de una pantalla
  async saveScreenState(screen: keyof ScreenState, data: any) {
    this.screenStates[screen] = data;
    
    try {
      await AsyncStorage.setItem('@screen_states', JSON.stringify(this.screenStates));
    } catch (error) {
      console.error('Error saving screen state:', error);
    }
  }

  // Guardar acción en el historial
  async recordAppAction(action: string, screen: string, data: any = {}) {
    const newItem: AppHistoryItem = {
      id: Date.now().toString(),
      action,
      screen,
      data,
      timestamp: new Date()
    };

    this.appHistory.push(newItem);
    
    try {
      await AsyncStorage.setItem('@app_history', JSON.stringify(this.appHistory));
    } catch (error) {
      console.error('Error saving history:', error);
    }
  }

  // Análisis inteligente del estado de cada pantalla
  analyzeScreenState(screen: keyof ScreenState): { status: string; details: string; recommendations?: string[] } {
    const state = this.screenStates[screen];
    
    switch (screen) {
      case 'Daily':
        if (!state || !state.appointments) {
          return { 
            status: 'No configurado', 
            details: 'No tienes citas programadas en Daily' 
          };
        }
        
        const today = new Date();
        const todayApps = state.appointments.filter((app: any) => 
          new Date(app.date).toDateString() === today.toDateString()
        );
        const upcomingApps = state.appointments.filter((app: any) => 
          new Date(app.date) > today
        );
        
        return {
          status: todayApps.length > 0 ? 'Citas hoy' : 'Sin citas hoy',
          details: `Tienes ${state.appointments.length} citas en total. ${todayApps.length} para hoy y ${upcomingApps.length} próximas.`,
          recommendations: todayApps.length > 0 ? 
            [`Revisa tus ${todayApps.length} citas de hoy`] : 
            ['Programa nuevas citas para organizarte mejor']
        };
      
      case 'Agenda':
        if (!state || !state.appointments) {
          return { 
            status: 'Vacía', 
            details: 'Tu agenda está vacía' 
          };
        }
        
        const completed = state.appointments.filter((app: any) => app.completed);
        const pending = state.appointments.filter((app: any) => !app.completed);
        
        return {
          status: pending.length > 0 ? 'Pendientes' : 'Todo completado',
          details: `Tienes ${state.appointments.length} citas: ${completed.length} completadas y ${pending.length} pendientes.`,
          recommendations: pending.length > 0 ? 
            [`Revisa tus ${pending.length} citas pendientes`] : 
            ['¡Buen trabajo! Todo está al día']
        };
      
      case 'General':
        if (!state || !state.services) {
          return { 
            status: 'No configurado', 
            details: 'Mantenimiento general no configurado' 
          };
        }
        
        return {
          status: state.lastService ? 'Configurado' : 'Por configurar',
          details: `Servicios: ${state.services.length} registrados. Último servicio: ${state.lastService || 'Nunca'}.`,
          recommendations: ['Programa mantenimiento regular para tu moto']
        };
      
      case 'Preventive':
        if (!state || !state.tasks) {
          return { 
            status: 'No configurado', 
            details: 'Mantenimiento preventivo no configurado' 
          };
        }
        
        const completionRate = state.tasks.length > 0 ? 
          Math.round((state.completed / state.tasks.length) * 100) : 0;
        
        return {
          status: completionRate === 100 ? 'Completado' : 'En progreso',
          details: `Tareas: ${state.tasks.length} totales, ${state.completed || 0} completadas (${completionRate}%).`,
          recommendations: completionRate < 100 ? 
            [`Completa las ${state.pending || 0} tareas pendientes`] : 
            ['¡Excelente! Mantenimiento preventivo al día']
        };
      
      case 'Emergency':
        if (!state || !state.contacts) {
          return { 
            status: 'Crítico', 
            details: 'Contactos de emergencia no configurados' 
          };
        }
        
        return {
          status: state.contacts.length > 3 ? 'Protegido' : 'Básico',
          details: `Tienes ${state.contacts.length} contactos de emergencia configurados.`,
          recommendations: ['Verifica que todos tus contactos estén actualizados']
        };
      
      case 'Profile':
        if (!state || !state.documents) {
          return { 
            status: 'Incompleto', 
            details: 'Perfil de usuario incompleto' 
          };
        }
        
        const validDocs = state.documentsStatus === 'al día';
        
        return {
          status: validDocs ? 'Completo' : 'Documentos vencidos',
          details: `Perfil: ${state.name || 'Sin nombre'}. ${state.documents.length} documentos. Estado: ${state.documentsStatus || 'Desconocido'}.`,
          recommendations: validDocs ? 
            [] : 
            ['Actualiza tus documentos lo antes posible']
        };
      
      case 'Route':
        if (!state || !state.routes) {
          return { 
            status: 'No configurado', 
            details: 'No tienes rutas guardadas' 
          };
        }
        
        return {
          status: state.routes.length > 0 ? 'Configurado' : 'Vacío',
          details: `Tienes ${state.routes.length} rutas guardadas. Favorita: ${state.favorite || 'Ninguna'}.`,
          recommendations: ['Explora nuevas rutas para variar tus recorridos']
        };
      
      default:
        return { status: 'Desconocido', details: 'Pantalla no reconocida' };
    }
  }

  // Generar respuesta inteligente y contextual
  generateIntelligentResponse(userMessage: string): string {
    const messageLower = userMessage.toLowerCase();
    
    // Análisis de sentimiento e intención básico
    const isQuestion = messageLower.includes('?') || 
                      messageLower.includes('cómo') || 
                      messageLower.includes('qué') || 
                      messageLower.includes('cuándo') ||
                      messageLower.includes('dónde') ||
                      messageLower.includes('por qué');
    
    const isGreeting = messageLower.includes('hola') || 
                      messageLower.includes('buenas') || 
                      messageLower.includes('saludos');
    
    const isThanks = messageLower.includes('gracias') || 
                    messageLower.includes('agradecido') || 
                    messageLower.includes('agradecida');
    
    // Detectar pantalla específica mencionada
    const mentionedScreens = [];
    if (messageLower.includes('daily') || messageLower.includes('cita') || messageLower.includes('evento')) mentionedScreens.push('Daily');
    if (messageLower.includes('agenda') || messageLower.includes('calendario')) mentionedScreens.push('Agenda');
    if (messageLower.includes('general') || messageLower.includes('mantenimiento') || messageLower.includes('reparación')) mentionedScreens.push('General');
    if (messageLower.includes('preventivo') || messageLower.includes('prevención') || messageLower.includes('revisión')) mentionedScreens.push('Preventive');
    if (messageLower.includes('emergencia') || messageLower.includes('urgencia') || messageLower.includes('accidente')) mentionedScreens.push('Emergency');
    if (messageLower.includes('perfil') || messageLower.includes('usuario') || messageLower.includes('documento')) mentionedScreens.push('Profile');
    if (messageLower.includes('ruta') || messageLower.includes('mapa') || messageLower.includes('navegación')) mentionedScreens.push('Route');
    
    // Respuesta contextual para preguntas sobre pantallas específicas
    if (mentionedScreens.length > 0) {
      let response = "";
      
      mentionedScreens.forEach(screen => {
        const analysis = this.analyzeScreenState(screen as keyof ScreenState);
        response += `📋 **${screen}**: ${analysis.details}\n`;
        
        if (analysis.recommendations && analysis.recommendations.length > 0) {
          response += `💡 *Recomendación*: ${analysis.recommendations[0]}\n\n`;
        } else {
          response += "\n";
        }
      });
      
      if (isQuestion) {
        response += "¿Necesitas más detalles sobre alguna de estas áreas?";
      }
      
      return response;
    }
    
    // Respuesta para saludos
    if (isGreeting) {
      return `¡Hola! 👋 Soy tu asistente inteligente conectado a todas tus pantallas.\n\n${this.getContextSummary()}\n\n¿En qué puedo ayudarte específicamente hoy?`;
    }
    
    // Respuesta para agradecimientos
    if (isThanks) {
      return "¡De nada! 😊 Me alegra poder ayudarte. ¿Hay algo más en lo que pueda asistirte?";
    }
    
    // Respuesta para solicitud de resumen general
    if (messageLower.includes('resumen') || messageLower.includes('estado') || messageLower.includes('cómo está') || messageLower.includes('cómo van')) {
      return this.getContextSummary();
    }
    
    // Respuesta para solicitud de ayuda
    if (messageLower.includes('ayuda') || messageLower.includes('qué puedes')) {
      return this.getHelpResponse();
    }
    
    // Respuesta para comandos de voz
    if (messageLower.includes('voz') || messageLower.includes('hablar') || messageLower.includes('micrófono')) {
      return "🎤 ¡Claro! Puedo escucharte. Usa el botón del micrófono para hablarme. Intenta decirme cosas como:\n• '¿Qué citas tengo hoy?'\n• 'Resumen de mi mantenimiento'\n• 'Ver mis documentos'\n• 'Estado de mis rutas'";
    }
    
    // Respuesta por defecto con análisis contextual
    return `🤔 Veo que preguntas sobre "${userMessage}".\n\n${this.getContextSummary()}\n\n¿Te interesa algún área específica? Puedo ayudarte con:\n• 📅 Citas y agenda\n• 🔧 Mantenimiento\n• 🆘 Emergencias\n• 👤 Tu perfil\n• 🗺️ Rutas\n\n¿Qué necesitas saber?`;
  }

  // Resumen contextual inteligente
  getContextSummary(): string {
    let summary = "📊 **Resumen de tu aplicación:**\n\n";
    let alerts = 0;
    
    // Analizar cada pantalla
    (Object.keys(this.screenStates) as Array<keyof ScreenState>).forEach(screen => {
      const analysis = this.analyzeScreenState(screen);
      summary += `• ${screen}: ${analysis.status}\n`;
      
      // Contar alertas (estados que necesitan atención)
      if (analysis.status.includes('Crítico') || 
          analysis.status.includes('Incompleto') || 
          analysis.status.includes('Vencido') ||
          analysis.status.includes('Pendiente')) {
        alerts++;
      }
    });
    
    // Añadir información de alertas
    if (alerts > 0) {
      summary += `\n⚠️ **Tienes ${alerts} área(s) que necesitan atención.** ¿Quieres que te ayude con alguna?`;
    } else {
      summary += `\n✅ **¡Todo parece en orden!** ¿En qué más puedo ayudarte?`;
    }
    
    // Añadir acciones recientes si las hay
    const recentActions = this.appHistory.slice(-3).reverse();
    if (recentActions.length > 0) {
      summary += "\n\n🕐 **Acciones recientes:**\n";
      recentActions.forEach(item => {
        const timeAgo = this.getTimeAgo(item.timestamp);
        summary += `• ${item.action} (${timeAgo})\n`;
      });
    }
    
    return summary;
  }

  // Respuesta de ayuda contextual
  getHelpResponse(): string {
    return `¡Claro! Estoy aquí para ayudarte. 📚\n\n**Puedo asistirte con:**\n\n• 📅 **Gestión de Citas**: Crear, ver y gestionar tus citas en Daily y Agenda\n• 🔧 **Mantenimiento**: Seguimiento de servicios generales y preventivos\n• 🆘 **Emergencias**: Contactos y protocolos de seguridad\n• 👤 **Perfil**: Gestión de documentos e información personal\n• 🗺️ **Rutas**: Planificación y seguimiento de recorridos\n\n**También puedo:**\n• 🎤 Responder a comandos de voz\n• 📊 Darte resúmenes de tu actividad\n• ⚡ Alertarte sobre pendientes importantes\n• 💡 Hacer recomendaciones personalizadas\n\n¿Qué te gustaría hacer?`;
  }

  // Calcular tiempo transcurrido
  private getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'hace un momento';
    if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)} h`;
    return `hace ${Math.floor(diffInSeconds / 86400)} días`;
  }

  // Buscar en el historial
  searchHistory(query: string): AppHistoryItem[] {
    const searchTerm = query.toLowerCase();
    return this.appHistory.filter(item =>
      item.action.toLowerCase().includes(searchTerm) ||
      item.screen.toLowerCase().includes(searchTerm) ||
      JSON.stringify(item.data).toLowerCase().includes(searchTerm)
    );
  }

  // Iniciar grabación de voz
  async startVoiceRecording(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos necesarios', 'Necesitas permitir el acceso al micrófono');
        return false;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      this.recording = new Audio.Recording();
      
      await this.recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      await this.recording.startAsync();
      this.isListening = true;
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      this.isListening = false;
      return false;
    }
  }

  // Detener grabación y transcribir
  async stopVoiceRecording(): Promise<string> {
    if (!this.recording || !this.isListening) return '';

    try {
      await this.recording.stopAndUnloadAsync();
      this.isListening = false;
      return this.simulateSpeechToText();
    } catch (error) {
      console.error('Error stopping recording:', error);
      return '';
    }
  }

  // Simular reconocimiento de voz con frases contextuales
  private simulateSpeechToText(): string {
    // Frases más contextuales basadas en el estado real de la app
    const contextualPhrases = [];
    
    // Frases basadas en el estado de Daily
    if (this.screenStates.Daily?.appointments?.length > 0) {
      contextualPhrases.push(
        "¿Qué citas tengo hoy en Daily?",
        "Ver mis próximas citas",
        "Agendar nueva cita"
      );
    }
    
    // Frases basadas en el estado de Agenda
    if (this.screenStates.Agenda?.appointments?.length > 0) {
      contextualPhrases.push(
        "¿Qué hay en mi agenda?",
        "Revisar mi calendario semanal",
        "Próximos eventos importantes"
      );
    }
    
    // Frases basadas en el estado de mantenimiento
    if (this.screenStates.General?.services || this.screenStates.Preventive?.tasks) {
      contextualPhrases.push(
        "Estado de mi mantenimiento",
        "¿Qué servicios necesita mi moto?",
        "Próximo mantenimiento preventivo"
      );
    }
    
    // Frases generales si no hay contexto específico
    if (contextualPhrases.length === 0) {
      contextualPhrases.push(
        "Quiero ver mis citas de hoy",
        "¿Qué tengo en mi agenda?",
        "Mostrar mi perfil",
        "Ver rutas guardadas",
        "Estado de mantenimiento",
        "Necesito ayuda con emergencias",
        "¿Qué he hecho recientemente?",
        "Resumen de mi aplicación"
      );
    }
    
    return contextualPhrases[Math.floor(Math.random() * contextualPhrases.length)];
  }

  // Hablar texto
  speak(text: string) {
    try {
      // Limpiar texto de markdown para voz
      const cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\n/g, '. ');
      Speech.speak(cleanText, {
        language: 'es-ES',
        pitch: 1.0,
        rate: 0.8
      });
    } catch (error) {
      console.error('Error speaking text:', error);
    }
  }

  // Método principal para generar respuestas (alias para compatibilidad)
  generateResponse(userMessage: string): string {
    return this.generateIntelligentResponse(userMessage);
  }
}

const ChatBotsScreen = () => {
  const navigation = useNavigation<ChatBotsScreenNavigationProp>();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [inputText, setInputText] = useState('');
  const [showFrequentQuestions, setShowFrequentQuestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const questionsScrollRef = useRef<ScrollView>(null);
  const agentRef = useRef(new IntelligentAgent());

  // Simular datos de ejemplo para cada pantalla
  const simulateScreenData = () => {
    // Datos de ejemplo para Daily
    agentRef.current.saveScreenState('Daily', {
      appointments: [
        { 
          id: '1', 
          title: 'Revisión mensual', 
          date: new Date(), 
          type: 'personal',
          description: 'Revisión general de la moto'
        },
        { 
          id: '2', 
          title: 'Cambio de aceite', 
          date: new Date(Date.now() + 86400000), 
          type: 'maintenance',
          description: 'Cambio de aceite y filtro'
        }
      ]
    });

    // Datos de ejemplo para Agenda
    agentRef.current.saveScreenState('Agenda', {
      appointments: [
        { 
          id: '1', 
          title: 'Reunión con equipo', 
          date: new Date(), 
          completed: false,
          description: 'Reunión semanal de coordinación'
        },
        { 
          id: '2', 
          title: 'Cita médica', 
          date: new Date(Date.now() + 172800000), 
          completed: false,
          description: 'Control médico anual'
        },
        { 
          id: '3', 
          title: 'Entrega de documentos', 
          date: new Date(Date.now() + 259200000), 
          completed: true,
          description: 'Entrega de documentos en notaría'
        }
      ]
    });

    // Datos de ejemplo para otras pantallas
    agentRef.current.saveScreenState('General', {
      services: ['Cambio aceite', 'Ajuste frenos', 'Lubricación cadena', 'Revisión general'],
      lastService: '2024-01-15',
      nextService: '2024-02-15'
    });

    agentRef.current.saveScreenState('Preventive', {
      tasks: ['Revisión semanal', 'Limpieza mensual', 'Calibración trimestral'],
      completed: 2,
      pending: 1
    });

    agentRef.current.saveScreenState('Emergency', {
      contacts: ['Seguro: 555-1234', 'Grúa: 555-5678', 'Mecánico: 555-9012', 'Hospital: 555-3456'],
      emergencyProtocol: 'activado'
    });

    agentRef.current.saveScreenState('Profile', {
      name: 'Usuario Motociclista',
      documents: ['SOAT', 'Tecnomecánica', 'Licencia', 'Tarjeta de propiedad'],
      documentsStatus: 'al día'
    });

    agentRef.current.saveScreenState('Route', {
      routes: ['Casa-Trabajo', 'Trabajo-Gimnasio', 'Ruta fin de semana', 'Viaje a la playa'],
      favorite: 'Casa-Trabajo',
      totalDistance: '350 km'
    });
  };

  // Mensaje de bienvenida inicial con voz
  useEffect(() => {
    const welcomeMessage: MessageType = {
      id: '1',
      text: "¡Hola! 👋 Soy tu asistente inteligente.\n\nPregúntame sobre cualquier área y te daré un análisis inteligente.\n\nDime como puedo ayudarte.",
      sender: 'bot',
      timestamp: new Date()
    };

    setMessages([welcomeMessage]);
    
    // Dar la bienvenida por voz
    setTimeout(() => {
      agentRef.current.speak("¡Hola! Soy tu asistente inteligente. Dime como puedo ayudarte.");
    }, 1000);

    // Simular datos
    simulateScreenData();

    // Registrar esta acción en el historial
    agentRef.current.recordAppAction(
      "Asistente inteligente iniciado",
      "ChatBotsScreen",
      { connectedScreens: ['Daily', 'General', 'Preventive', 'Emergency', 'Profile', 'Route', 'Agenda'] }
    );

  }, []);

  // Recargar datos cuando la pantalla recibe foco
  useFocusEffect(
    React.useCallback(() => {
      simulateScreenData();
    }, [])
  );

  // Desplazarse al final de la lista de mensajes
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Función para enviar mensaje
  const sendMessage = () => {
    if (inputText.trim() === '') return;

    setShowFrequentQuestions(false);
    setIsProcessing(true);

    // Agregar mensaje del usuario
    const userMessage: MessageType = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Registrar en historial
    agentRef.current.recordAppAction(
      "Usuario envió mensaje",
      "ChatBotsScreen",
      { message: inputText }
    );

    // Generar y agregar respuesta del agente
    setTimeout(() => {
      const botResponse = agentRef.current.generateResponse(inputText);
      const botMessage: MessageType = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
      
      // Responder por voz
      agentRef.current.speak(botResponse);
      setIsProcessing(false);

    }, 1000);
  };

  // Manejar comandos de voz
  const handleVoiceCommand = async () => {
    if (isListening) {
      setIsListening(false);
      const transcription = await agentRef.current.stopVoiceRecording();
      if (transcription) {
        setInputText(transcription);
        setTimeout(() => sendMessage(), 300);
      }
    } else {
      const started = await agentRef.current.startVoiceRecording();
      setIsListening(started);
      
      if (started) {
        const listeningMessage: MessageType = {
          id: Date.now().toString(),
          text: "🎤 Escuchando... Habla ahora",
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, listeningMessage]);
      } else {
        Alert.alert('Error', 'No se pudo iniciar la grabación. Verifica los permisos del micrófono.');
      }
    }
  };

  // Navegar a pantalla de IA avanzada
  const navigateToIAScreen = () => {
    navigation.navigate('IAScreen' as any);
    
    agentRef.current.recordAppAction(
      "Navegación a pantalla IA avanzada",
      "ChatBotsScreen",
      { target: "IAScreen" }
    );
  };

  // Función para seleccionar pregunta frecuente
  const selectFrequentQuestion = (question: string) => {
    setInputText(question);
    setShowFrequentQuestions(false);
    setTimeout(() => sendMessage(), 100);
  };

  // Toggle para mostrar/ocultar preguntas frecuentes
  const toggleFrequentQuestions = () => {
    setShowFrequentQuestions(!showFrequentQuestions);
  };

  // Preguntas frecuentes contextuales
  const frequentQuestions = {
    Daily: [
      "¿Qué citas tengo hoy en Daily?",
      "¿Cómo agendo una nueva cita?",
      "Ver mis próximos eventos en Daily"
    ],
    Agenda: [
      "¿Qué hay en mi agenda para esta semana?",
      "Próximas citas programadas",
      "Revisar mi calendario mensual"
    ],
    Mantenimiento: [
      "Estado de mantenimiento general de mi moto",
      "¿Qué servicios tengo pendientes?",
      "Historial de reparaciones recientes",
      "Próximo mantenimiento preventivo recomendado"
    ],
    Emergencia: [
      "Contactos de emergencia disponibles",
      "¿Qué hacer en caso de accidente?",
      "Protocolos de emergencia activos"
    ],
    Perfil: [
      "Ver mi información de perfil completa",
      "Estado actual de mis documentos",
      "¿Necesito actualizar algún documento?"
    ],
    Rutas: [
      "Rutas guardadas recientemente",
      "¿Cómo planificar una nueva ruta?",
      "Historial de recorridos realizados"
    ],
    Análisis: [
      "Resumen general de mi aplicación",
      "¿Qué áreas necesitan atención?",
      "Recomendaciones personalizadas"
    ]
  };

  // Renderizar cada mensaje del chat
  const renderMessage = ({ item }: { item: MessageType }) => {
    const isUser = item.sender === 'user';
    
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.botMessageContainer]}>
        {!isUser && (
          <View style={styles.botAvatar}>
            <Image 
              source={require('../../assets/imagen/help2.png')}
              style={styles.botAvatarImage}
              resizeMode="contain"
            />
          </View>
        )}
        
        <View style={[styles.messageBubble, isUser ? styles.userMessageBubble : styles.botMessageBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.botMessageText]}>
            {item.text}
          </Text>
          <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.botTimestamp]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {isUser && (
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={20} color="white" />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#020479ff', '#0eb9e3', '#58fd03']}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.navigate('Todo')}
          >
            <Ionicons name="arrow-back" size={34} color="white" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Asistente Inteligente</Text>
            {/* <Text style={styles.headerSubtitle}>Análisis contextual avanzado</Text> */}
          </View>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => Alert.alert(
              '🧠 Asistente Inteligente', 
              'Analizo el contexto de todas tus pantallas:\n\n• 📅 Daily - Citas y eventos\n• 📋 Agenda - Calendario completo\n• 🔧 General - Mantenimiento básico\n• 🛡️ Preventive - Prevención\n• 🆘 Emergency - Emergencias\n• 👤 Profile - Perfil y documentos\n• 🗺️ Route - Rutas y navegación\n\n¡Pregúntame sobre cualquier área!'
            )}
          >
            <Ionicons name="help-circle" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Área de Chat */}
        <View style={styles.chatContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Indicador de estado */}
        {(isProcessing || isListening) && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              {isListening ? "🎤 Escuchando..." : "🧠 Analizando contexto..."}
            </Text>
          </View>
        )}

        {/* Botones de acción */}
        <View style={styles.actionButtonsContainer}>
          {/* <TouchableOpacity 
            style={[styles.actionButton, isListening && styles.listeningButton]}
            onPress={handleVoiceCommand}
            disabled={isProcessing}
          >
            <Ionicons 
              name={isListening ? "mic-off" : "mic"} 
              size={22} 
              color="white" 
            />
            <Text style={styles.actionButtonText}>
              {isListening ? "Detener" : "Voz"}
            </Text>
          </TouchableOpacity> */}

          <TouchableOpacity 
            style={styles.helpButton}
            onPress={() => navigation.navigate({ name: 'IA' } as any)}
            disabled={isProcessing}
          >
          <LinearGradient
              colors={['rgba(128, 0, 255, 1)', '#0eb9e3', '#8003fdff']}
              start={{ x: 0, y: 0.2 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
          >
            <Ionicons name="hardware-chip" size={22} color="white" />
            <Text style={styles.actionButtonText}>  IA Avanzada</Text>
          </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.helpButton}
            onPress={toggleFrequentQuestions}
            disabled={isProcessing}
          >
          <LinearGradient
              colors={['#0509f7ff', '#0eb9e3', '#0509f7ff']}
              start={{ x: 0, y: 0.2 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
          >
            <Ionicons name="help-circle" size={22} color="white" />
            <Text style={styles.actionButtonText}>  Preguntas Frecuentes</Text>
          </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Panel de preguntas frecuentes desplegable */}
        {showFrequentQuestions && (
          <View style={styles.questionsPanel}>
            <View style={styles.questionsHeader}>
              <Text style={styles.questionsTitle}>Preguntas Contextuales</Text>
              <TouchableOpacity onPress={toggleFrequentQuestions}>
                <Ionicons name="close" size={24} color="#6E45E2" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              ref={questionsScrollRef}
              style={styles.questionsScroll}
              showsVerticalScrollIndicator={true}
            >
              {Object.entries(frequentQuestions).map(([category, questions]) => (
                <View key={category} style={styles.questionCategory}>
                  <Text style={styles.categoryTitle}>
                    {category}
                  </Text>
                  {questions.map((question, index) => (
                    <TouchableOpacity
                      key={`${category}-${index}`}
                      style={styles.questionButton}
                      onPress={() => selectFrequentQuestion(question)}
                    >
                      <Text style={styles.questionText}>{question}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input de mensaje */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inputContainer}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Pregunta..."
              placeholderTextColor="#999"
              multiline
              maxLength={500}
              onSubmitEditing={sendMessage}
              editable={!isProcessing}
            />
            <TouchableOpacity 
              style={[styles.sendButton, (!inputText || isProcessing) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!inputText || isProcessing}
            >
              <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default ChatBotsScreen;