import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
  Linking,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import styles from './IAScreen.styles';

type RootStackParamList = {
  Todo: undefined;
};
// Prompt especializado en motocicletas
const IA_PROMPT =
   "Responde como un experto de talla mundial en motocicletas, con dominio absoluto de la documentación técnica y la reparación de todos sus sistemas. Ofrece explicaciones precisas y completas, pero expresadas con claridad pedagógica, como lo haría un gran profesor. Ahora, responde lo siguiente:";

// URLs de DeepSeek
const DEEPSEEK_IOS_URL =
  "https://apps.apple.com/app/deepseek-chat/id6478312411";
const DEEPSEEK_ANDROID_URL =
  "https://play.google.com/store/apps/details?id=com.deepseek.chat";
const DEEPSEEK_APP_URL =
  Platform.OS === "ios" ? DEEPSEEK_IOS_URL : DEEPSEEK_ANDROID_URL;

const IAScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isLoading, setIsLoading] = useState(false);
  const [questionModalVisible, setQuestionModalVisible] = useState(false);
  const [openModalVisible, setOpenModalVisible] = useState(false);
  const [userQuestion, setUserQuestion] = useState("");

  // FUNCIÓN ROBUSTA para abrir DeepSeek
  const openDeepSeekApp = async (): Promise<boolean> => {
    try {
      // Intentar abrir con scheme oficial
      const scheme = "deepseek-chat://";
      const canOpen = await Linking.canOpenURL(scheme);

      if (canOpen) {
        await Linking.openURL(scheme);
        return true;
      }

      // Android: intentar con package
      if (Platform.OS === "android") {
        try {
          await Linking.openURL(
            "intent://#Intent;package=com.deepseek.chat;scheme=deepseek;end;"
          );
          return true;
        } catch (err) {
          console.log("Error intent Android:", err);
        }
      }

      // Si nada funciona → ir a la tienda
      await Linking.openURL(DEEPSEEK_APP_URL);
      return false;
    } catch (error) {
      console.log("Error abriendo DeepSeek:", error);
      return false;
    }
  };

  const handleHelpPress = async () => {
    setQuestionModalVisible(true);
  };

  const handleSubmitQuestion = async () => {
    if (!userQuestion.trim()) {
      Alert.alert("Error", "Por favor, escribe tu pregunta sobre motocicletas.");
      return;
    }

    setIsLoading(true);

    try {
      const fullPrompt = `${IA_PROMPT} ${userQuestion.trim()}`;
      await Clipboard.setStringAsync(fullPrompt);

      setQuestionModalVisible(false);
      setOpenModalVisible(true);
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", "No se pudo copiar la pregunta.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDeepSeek = async () => {
    setIsLoading(true);

    try {
      const opened = await openDeepSeekApp();

      if (opened) {
        setTimeout(() => {
          setOpenModalVisible(false);
          Alert.alert(
            "✅ DeepSeek abierto",
            "Tu pregunta está copiada al portapapeles. Pégala en DeepSeek.",
            [{ text: "Entendido" }]
          );
        }, 800);
      } else {
        Alert.alert(
          "Abrir DeepSeek",
          "No fue posible abrir automáticamente. Abre la app manualmente y pega tu pregunta.",
          [
            { text: "Descargar", onPress: () => Linking.openURL(DEEPSEEK_APP_URL) },
            { text: "Cancelar", style: "cancel" },
          ]
        );
      }
    } catch (error) {
      console.error("Error:", error);
      Alert.alert(
        "Error",
        "No se pudo abrir DeepSeek. Intenta abrirlo manualmente desde tu menú de aplicaciones.",
        [{ text: "Entendido" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadDeepSeek = async () => {
    try {
      await Linking.openURL(DEEPSEEK_APP_URL);
    } catch (error) {
      Alert.alert("Error", "No se pudo abrir la tienda de aplicaciones");
    }
  };

  return (
    <>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <LinearGradient
        colors={["#020479ff", "#0eb9e3", "#58fd03"]}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.container,
          { paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
        ]}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Asistencia IA</Text>
          <Text style={styles.subtitle}>Expertos en motocicletas</Text>

          <Text style={styles.description}>
            Obtén respuestas en cualquier tema 
            de motocicletas 
            usando la potencia de DeepSeek AI
          </Text>

          <View style={styles.requirementBox}>
            <Ionicons
              name="information-circle"
              size={20}
              color="#fff"
              style={styles.infoIcon}
            />
            <Text style={styles.requirementText}>
              Requisito: Debes tener DeepSeek instalado en tu teléfono
            </Text>
          </View>

          <TouchableOpacity
            style={styles.helpButton}
            onPress={handleHelpPress}
            disabled={isLoading}
          >
            <LinearGradient
              colors={["#FF0080", "#FF8C00", "#FFEE00"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons
                    name="chatbubble-ellipses"
                    size={24}
                    color="white"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.helpButtonText}>
                    ¿Cómo te podemos ayudar?
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.helpButton}
            onPress={handleDownloadDeepSeek}
          >
            <LinearGradient
              colors={["#00ddffff", "#2f00ffff", "#00d5ffff"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
            <Ionicons
              name="download-outline"
              size={20}
              color="#0eb9e3"
              style={styles.downloadIcon}
            />
            <Text style={styles.downloadButtonText}>Descargar DeepSeek</Text>
            </LinearGradient>
          </TouchableOpacity>
           <TouchableOpacity
            style={styles.helpButton}
            onPress={() => navigation.navigate({ name: 'Todo' } as any)}
          >
             <LinearGradient
              colors={["#00ddffff", "#2f00ffff", "#00d5ffff"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
             <Text style={styles.downloadButtonText}>Inicio</Text>
            </LinearGradient>  
          </TouchableOpacity>
        </View>

        {/* Modal de pregunta */}
        <Modal
          visible={questionModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setQuestionModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.modalContainer}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Consulta Especializada</Text>
                  <TouchableOpacity
                    onPress={() => setQuestionModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalDescription}>
                  Escribe tu pregunta específica sobre motocicletas:
                </Text>

                <TextInput
                  style={styles.questionInput}
                  placeholder="Ejemplo: ¿Por qué mi moto pierde potencia en subidas?"
                  value={userQuestion}
                  onChangeText={setUserQuestion}
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                  autoFocus={true}
                  placeholderTextColor="#999"
                />

                <Text style={styles.noteText}>
                  * Tu pregunta se enviará a DeepSeek con instrucciones
                  especializadas
                </Text>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    !userQuestion.trim() && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmitQuestion}
                  disabled={!userQuestion.trim() || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      Copiar y Continuar
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Modal para abrir DeepSeek */}
        <Modal
          visible={openModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setOpenModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.openModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>✅ Pregunta Copiada</Text>
                <TouchableOpacity
                  onPress={() => setOpenModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalDescription}>
                Tu pregunta especializada ha sido copiada al portapapeles. Ahora
                puedes abrir DeepSeek y pegarla para obtener tu respuesta.
              </Text>

              <View style={styles.instructionBox}>
                <Ionicons name="clipboard-outline" size={24} color="#0eb9e3" />
                <Text style={styles.instructionText}>
                  En DeepSeek: Presiona prolongadamente en el campo de texto y
                  selecciona "Pegar"
                </Text>
              </View>

              <TouchableOpacity
                style={styles.openButton}
                onPress={handleOpenDeepSeek}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons
                      name="open-outline"
                      size={24}
                      color="white"
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.openButtonText}>Abrir DeepSeek</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setOpenModalVisible(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </>
  );
};

export default IAScreen;
