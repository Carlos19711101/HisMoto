import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  SafeAreaView,
  StatusBar,
  Modal,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar, DateData } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import styles from './DailyScreen.styles';

type AppointmentType = 'personal' | 'work' | 'medical' | 'urgent' | 'other';

interface Appointment {
  id: string;
  title: string;
  description: string;
  date: Date;
  endDate?: Date;
  type: AppointmentType;
  reminder: boolean;
  reminderTime?: Date;
  completed: boolean;
}

interface MarkedDates {
  [date: string]: {
    dots?: { key: string; color: string }[];
    selected?: boolean;
    selectedColor?: string;
  };
}

type RootStackParamList = {
  Agenda: { appointments: Appointment[] };
  Daily: undefined;
};

const STORAGE_KEY = '@professional_appointments';

const DailyScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState<AppointmentType | 'all'>('all');

  // Estados para control de DateTimePicker
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDateTime, setSelectedDateTime] = useState(new Date());
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('personal');

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const loadedAppointments: Appointment[] = parsed.map((app: any) => ({
          ...app,
          date: new Date(app.date),
          endDate: app.endDate ? new Date(app.endDate) : undefined,
          reminderTime: app.reminderTime ? new Date(app.reminderTime) : undefined,
        }));
        setAppointments(loadedAppointments);
      }
    } catch (e) {
      console.error('Error loading appointments:', e);
      Alert.alert('Error', 'No se pudieron cargar las citas');
    }
  };

  const saveAppointments = async (apps: Appointment[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
    } catch (e) {
      console.error('Error saving appointments:', e);
      Alert.alert('Error', 'No se pudieron guardar las citas');
    }
  };
    // Funciones para obtener colores icono de las distintas citas
  const getTypeColor = (type: AppointmentType): string => {
  const colors = {
    personal: '#f8fc0bff',    // Amarillo
    work: '#0af5e5fc',        // Turquesa
    medical: '#deddfae2',    // Rojo
    urgent: '#f60707ff',      // Morado
    other: '#42fb0ea8',     // Verde 
  };
  return colors[type];
};
 // Funciones para obtener colores para el fondo del boton de las distintas citas 
const getTypeLightColor = (type: AppointmentType): string => {
  const lightColors = {
    personal: '#0c0c0c',  // Amarillo claro
    work: '#0c0c0c',      // Turquesa claro
    medical: '#0c0c0c',   // Rojo claro
    urgent: '#0c0c0c',    // Morado claro
    other: '#0c0c0c',     // Verde claro
  };
  return lightColors[type];
};

  const getTypeIcon = (type: AppointmentType): string => {
    const icons = {
      personal: 'person',
      work: 'briefcase',
      medical: 'medkit',
      urgent: 'warning',
      other: 'calendar',
    };
    return icons[type];
  };

  const markedDates = useMemo((): MarkedDates => {
    const marks: MarkedDates = {};

    appointments.forEach(app => {
      const dateStr = app.date.toISOString().split('T')[0];
      
      if (!marks[dateStr]) {
        marks[dateStr] = {
          dots: [{ key: app.id, color: getTypeColor(app.type) }],
        };
      } else {
        // Si ya hay puntos para esta fecha, agregamos uno nuevo
        marks[dateStr].dots?.push({ key: app.id, color: getTypeColor(app.type) });
      }
    });

    if (selectedDate) {
      marks[selectedDate] = {
        ...marks[selectedDate],
        selected: true,
        selectedColor: '#e30e0eff',
      };
    }

    return marks;
  }, [appointments, selectedDate]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    const now = new Date();
    setSelectedDateTime(now);
    setAppointmentType('personal');
    setShowModal(false);
  };

  const handleSaveAppointment = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre para la cita');
      return;
    }

    const newAppointment: Appointment = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      date: selectedDateTime,
      type: appointmentType,
      reminder: false,
      completed: false,
    };

    const updatedApps = [...appointments, newAppointment];
    setAppointments(updatedApps);
    saveAppointments(updatedApps);
    setShowModal(false);
    resetForm();

    // Navegar a AgendaScreen después de crear la cita
    navigation.navigate('Agenda', { appointments: updatedApps });
    
    // Opcional: Mostrar alerta de éxito
    Alert.alert(
      'Éxito', 
      'Cita creada correctamente', 
      [{ text: 'OK' }]
    );
  };

  const openPicker = (mode: 'date' | 'time') => {
    setPickerMode(mode);
    setShowPicker(true);
  };

  const onChangePicker = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }
    
    if (selectedDate) {
      if (pickerMode === 'date') {
        // Cuando se selecciona una fecha, actualizamos la fecha pero mantenemos la hora actual
        const newDate = new Date(selectedDate);
        newDate.setHours(selectedDateTime.getHours(), selectedDateTime.getMinutes());
        setSelectedDateTime(newDate);
        // Abrimos inmediatamente el selector de hora
        openPicker('time');
      } else {
        // Cuando se selecciona una hora, actualizamos solo la hora
        const newDate = new Date(selectedDateTime);
        newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
        setSelectedDateTime(newDate);
        setShowPicker(false);
      }
    }
  };

  const navigateToAgenda = () => {
    navigation.navigate('Agenda', { appointments });
  };

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={['#090FFA', '#0eb9e3', '#58fd03']}
          style={styles.container}
        >
          {/* Header */}
         <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate({ name: 'Todo' } as any)}
        >
          <AntDesign name="doubleleft" size={44} color="white" />
        </TouchableOpacity>
          <View style={styles.header}>
            <Text style={styles.title}>Agéndate</Text>
            {/* Botón para ir a Agenda - Mejorado */}
            <TouchableOpacity 
              style={styles.agendaButton}
              onPress={navigateToAgenda}
            >
              <Ionicons name="list" size={24} color="#ffffff" />
              <Text style={styles.agendaButtonText}>Ver Agenda</Text>
            </TouchableOpacity>
          </View>

          {/* Búsqueda - Ahora es un botón decorativo */}
          <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.filterContainer}
            >
              <TouchableOpacity
                style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
                onPress={() => setFilterType('all')}
              >
                <Text style={styles.filterText}>Todos</Text>
              </TouchableOpacity>

              {(['personal', 'work', 'medical', 'urgent', 'other'] as AppointmentType[]).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterButton,
                    filterType === type && styles.filterButtonActive,
                    { 
                      backgroundColor: getTypeLightColor(type),
                      borderColor: getTypeColor(type),
                    }
                  ]}
                  onPress={() => setFilterType(type)}
                >
                  <Ionicons
                    name={getTypeIcon(type) as any}
                    size={16}
                    color={getTypeColor(type)}
                  />
                  <Text style={[styles.filterText, { color: getTypeColor(type) }]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

          {/* Calendario */}
          <View style={styles.calendarContainer}>
            <Calendar
              current={selectedDate}
              minDate={new Date().toISOString().split('T')[0]}
              onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
              markedDates={markedDates}
              markingType={'multi-dot'}
              theme={{
                backgroundColor: 'transparent',
                calendarBackground: 'transparent',
                textSectionTitleColor: '#ffffff',
                selectedDayBackgroundColor: '#0eb9e3',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#58fd03',
                dayTextColor: '#ffffff',
                textDisabledColor: '#aaaaaa',
                dotColor: '#58fd03',
                selectedDotColor: '#ffffff',
                arrowColor: '#58fd03',
                monthTextColor: '#ffffff',
                indicatorColor: '#58fd03',
                textDayFontWeight: '300',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '300',
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 14,
              }}
            />
          </View>

          {/* Botón Flotante */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowModal(true)}
          >
            <Ionicons name="add" size={50} color="#ffffff" />
          </TouchableOpacity>

          {/* Modal para crear cita */}
          <Modal
            visible={showModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowModal(false)}
          >
            <View style={styles.modalOverlay}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalContainer}
              >
                <ScrollView
                  contentContainerStyle={styles.modalContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Header del Modal */}
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Nueva Cita</Text>
                    <TouchableOpacity
                      onPress={() => setShowModal(false)}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={24} color="#ffffff" />
                    </TouchableOpacity>
                  </View>

                  {/* Contenido Modal */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>1. Nombre Cita</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Nombre de la cita"
                      placeholderTextColor="#aaaaaa"
                      value={title}
                      onChangeText={setTitle}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Descripción Adiccional</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Descripción (opcional)"
                      placeholderTextColor="#aaaaaa"
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>2. Elige Tipo de Cita</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.typeSelector}
                      >
                        {(['personal', 'work', 'medical', 'urgent', 'other'] as AppointmentType[]).map(type => (
                          <TouchableOpacity
                            key={type}
                            style={[
                              styles.typeOption,
                              appointmentType === type && styles.typeOptionSelected,
                              { 
                                backgroundColor: getTypeLightColor(type),
                                borderColor: getTypeColor(type),
                              }
                            ]}
                            onPress={() => setAppointmentType(type)}
                          >
                            <Ionicons
                              name={getTypeIcon(type) as any}
                              size={16}
                              color={getTypeColor(type)}
                            />
                            <Text style={[styles.typeOptionText, { color: getTypeColor(type) }]}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>3. Elige Fecha y Hora</Text>
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => openPicker('date')}
                    >
                      <Ionicons name="calendar" size={20} color="#0eb9e3" />
                      <Text style={styles.timeButtonText}>
                        {selectedDateTime.toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Footer del Modal - Solo botón de crear */}
                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={[styles.saveButton, { width: '100%' }]}
                      onPress={handleSaveAppointment}
                    >
                      <Text style={styles.saveButtonText}>4. Crear Cita</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            </View>

            {/* DateTimePicker */}
            {showPicker && (
              <DateTimePicker
                value={selectedDateTime}
                mode={pickerMode}
                display="default"
                onChange={onChangePicker}
              />
            )}
          </Modal>
        </LinearGradient>
      </SafeAreaView>
    </>
  );
};

export default DailyScreen;