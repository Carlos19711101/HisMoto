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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import styles from './ChatBotsScreen.styles';

// Definir los tipos de navegación
type RootStackParamList = {
  Welcome: undefined;
  Todo: undefined;
  ChatBotsScreen: undefined;
};

type ChatBotsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ChatBotsScreen'>;

// Tipos para los mensajes del chat
type MessageType = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
};

// Base de conocimiento mejorada para el chatbot
const knowledgeBase: { [key: string]: string[] } = {
  saludo: [
    "¡Hola! 👋 Soy tu asistente de Documenta la Historia. ¿En qué puedo ayudarte con tu motocicleta hoy?",
    "¡Buenas! 🏍️ Estoy aquí para ayudarte con todo lo relacionado con tu moto. ¿Qué necesitas?",
    "¡Hola! ¿Cómo estás? Soy tu asistente virtual para el cuidado de tu motocicleta."
  ],
  despedida: [
    "¡Hasta luego! 🏍️ Recuerda mantener tu moto siempre en perfecto estado.",
    "¡Nos vemos! 👋 No olvides documentar todos tus mantenimientos.",
    "¡Adiós! Que tengas excelentes recorridos con tu motocicleta."
  ],
  mantenimiento: [
    "Para registrar un mantenimiento, ve a la sección 'Mantenimiento Preventivo' o 'Mantenimiento General' según corresponda. 📝",
    "Puedes documentar mantenimientos tomando fotos y subiendo comprobantes desde la galería de tu celular. 📸",
    "Te recomiendo registrar cada mantenimiento apenas lo realices para tener un historial actualizado. ⏰"
  ],
  documentacion: [
    "En la sección 'Perfil' puedes actualizar documentos como SOAT, tecnomecánica y pico y placa. 📄",
    "Mantén siempre vigentes tus documentos legales para circular sin problemas. 🚦",
    "La app te permite almacenar fotos de tus documentos importantes para tenerlos siempre a mano. 🔒"
  ],
  rutas: [
    "En 'Gestión de Rutas' puedes planificar y guardar tus recorridos favoritos. 🗺️",
    "Tenemos integración con Google Maps y Waze para que encuentres las mejores rutas. 📍",
    "Puedes registrar tus rutas diarias y mantener un historial de tus recorridos. 🏁"
  ],
  emergencia: [
    "El 'Modo Emergencia' te ayuda en caso de percances en la vía. 🆘",
    "En emergencias, mantén la calma y usa la sección dedicada para documentar lo sucedido. 🚨",
    "La app te guiará paso a paso en caso de una emergencia vial. 🔧"
  ],
  general: [
    "Documenta la Historia te ayuda a mantener un registro completo de tu motocicleta. 📊",
    "Puedes gestionar mantenimientos, rutas, documentación y emergencias desde la app. 📱",
    "Cada sección está diseñada para hacerte la vida más fácil como motociclista. 😊"
  ],
  default: [
    "Interesante pregunta. ¿Podrías reformularla? 🤔",
    "No estoy seguro de entender. ¿Podrías ser más específico? 🏍️",
    "Esa es una buena pregunta. ¿Te importa explicarme un poco más? 📝"
  ]
};

// Palabras clave para categorizar preguntas
const keywords: { [key: string]: string[] } = {
  saludo: ['hola', 'buenos días', 'buenas tardes', 'buenas noches', 'qué tal', 'saludos'],
  despedida: ['adiós', 'chao', 'hasta luego', 'nos vemos', 'gracias', 'bye'],
  mantenimiento: ['mantenimiento', 'aceite', 'frenos', 'llantas', 'motor', 'reparar', 'mecánico', 'servicio'],
  documentacion: ['soat', 'tecnomecánica', 'documentos', 'pico y placa', 'papeles', 'legal', 'seguro'],
  rutas: ['ruta', 'recorrido', 'mapa', 'dirección', 'google maps', 'waze', 'navegación'],
  emergencia: ['emergencia', 'accidente', 'choque', 'avería', 'falla', 'urgencia', 'ayuda'],
  general: ['app', 'aplicación', 'uso', 'funciona', 'qué es', 'cómo']
};

// Preguntas frecuentes organizadas por categorías
const frequentQuestions = {
  mantenimiento: [
    "¿Cómo registro un mantenimiento preventivo?",
    "¿Cada cuánto debo hacer mantenimiento a mi moto?",
    "¿Qué documentos necesito para un mantenimiento?",
    "¿Puedo agregar fotos de los mantenimientos?"
  ],
  documentacion: [
    "¿Dónde actualizo el SOAT de mi moto?",
    "¿Cómo registro la tecnomecánica?",
    "¿Qué documentación debo tener al día?",
    "¿La app me alerta sobre vencimientos?"
  ],
  rutas: [
    "¿Cómo planifico una nueva ruta?",
    "¿Puedo guardar mis rutas favoritas?",
    "¿La app tiene integración con Google Maps?",
    "¿Cómo veo mi historial de recorridos?"
  ],
  emergencia: [
    "¿Qué hacer en caso de accidente?",
    "¿Cómo uso el modo emergencia?",
    "¿Qué información debo tener a mano en emergencias?",
    "¿La app me guía en procedimientos de emergencia?"
  ],
  general: [
    "¿Cómo usar la app por primera vez?",
    "¿Puedo tener múltiples motos en la app?",
    "¿Cómo cambio mi foto de perfil?",
    "¿La app funciona sin internet?"
  ]
};

const ChatBotsScreen = () => {
  const navigation = useNavigation<ChatBotsScreenNavigationProp>();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [inputText, setInputText] = useState('');
  const [showFrequentQuestions, setShowFrequentQuestions] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const questionsScrollRef = useRef<ScrollView>(null);

  // Mensaje de bienvenida inicial
  useEffect(() => {
    const welcomeMessage: MessageType = {
      id: '1',
      text: "¡Hola! 👋Soy tu asistente virtual.\nEstamos en construcción 🛠️,\nPor lo que aún puedo cometer algunos errores,\nEstamos trabajando para mejorar y ofrecerte la mejor experiencia posible 📄\n¿En qué puedo ayudarte hoy? 😊",   
      sender: 'bot',
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, []);

  // Desplazarse al final de la lista de mensajes
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Función para analizar la pregunta y generar respuesta
  const generateResponse = (userMessage: string): string => {
    const messageLower = userMessage.toLowerCase();
    
    // Buscar categoría basada en palabras clave
    let category = 'default';
    
    for (const [key, words] of Object.entries(keywords)) {
      if (words.some(word => messageLower.includes(word))) {
        category = key;
        break;
      }
    }
    
    // Seleccionar respuesta aleatoria de la categoría
    const responses = knowledgeBase[category];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  // Función para enviar mensaje
  const sendMessage = () => {
    if (inputText.trim() === '') return;

    // Ocultar preguntas frecuentes al enviar mensaje
    setShowFrequentQuestions(false);

    // Agregar mensaje del usuario
    const userMessage: MessageType = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Generar y agregar respuesta del bot después de un breve delay
    setTimeout(() => {
      const botResponse = generateResponse(inputText);
      const botMessage: MessageType = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    }, 500);
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
        colors={['#6E45E2', '#090FFA', '#88D3CE']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
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
            <Text style={styles.headerTitle}>Asistente Virtual</Text>
            {/* <Text style={styles.headerSubtitle}>Documenta la Historia</Text> */}
          </View>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => Alert.alert(
              '💡 Tips de uso', 
              '• Pregunta sobre mantenimientos\n• Consulta sobre documentación\n• Planifica rutas\n• Emergencias viales\n• Uso de la aplicación'
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

        {/* Botón para desplegar preguntas frecuentes */}
        {!showFrequentQuestions && messages.length <= 5 && (
          <TouchableOpacity 
            style={styles.showQuestionsButton}
            onPress={toggleFrequentQuestions}
          >
            <Ionicons name="help-circle-outline" size={20} color="white" />
            <Text style={styles.showQuestionsText}>Preguntas frecuentes</Text>
            <Ionicons name={showFrequentQuestions ? "chevron-up" : "chevron-down"} size={16} color="white" />
          </TouchableOpacity>
        )}

        {/* Panel de preguntas frecuentes desplegable */}
        {showFrequentQuestions && (
          <View style={styles.questionsPanel}>
            <View style={styles.questionsHeader}>
              <Text style={styles.questionsTitle}>Preguntas Frecuentes</Text>
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
                    {category.charAt(0).toUpperCase() + category.slice(1)}
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
              placeholder="Escribe tu pregunta..."
              placeholderTextColor="#999"
              multiline
              maxLength={500}
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity 
              style={[styles.sendButton, !inputText && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!inputText}
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