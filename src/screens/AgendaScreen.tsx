import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  Animated,
  Modal,
  Platform,
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import styles from './AgendaScreen.styles';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
  reminderMinutes?: number;
  completed: boolean;
  notificationId?: string;
}

type RootStackParamList = {
  Agenda: { appointments: Appointment[] };
  Daily: undefined;
};

const STORAGE_KEY = '@professional_appointments';

const AgendaScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'Agenda'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [appointments, setAppointments] = useState<Appointment[]>(route.params?.appointments || []);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<AppointmentType | 'all'>('all');
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    loadAppointments();
    registerForPushNotifications();
    const subscriptions = setupNotificationListeners();

    return () => {
      subscriptions.forEach(sub => sub.remove());
    };
  }, []);

  const setupNotificationListeners = () => {
    const subscriptions = [
      Notifications.addNotificationReceivedListener(notification => {
        console.log('Notificación recibida:', notification);
      }),
      Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Usuario interactuó con la notificación:', response);
      }),
    ];
    return subscriptions;
  };

  const registerForPushNotifications = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Permisos necesarios', 'Se necesitan permisos para enviar recordatorios');
        return;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    } catch (error) {
      console.error('Error al registrar notificaciones:', error);
    }
  };

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

        // Reprogramar notificaciones para citas futuras
        for (const app of loadedAppointments) {
          if (app.reminder && app.reminderTime && !app.completed) {
            await schedulePushNotification(app);
          }
        }
      }
    } catch (e) {
      console.error('Error loading appointments:', e);
      Alert.alert('Error', 'No se pudieron cargar las citas');
    }
  };

  const schedulePushNotification = async (app: Appointment) => {
    try {
      if (!app.reminderTime) return;

      // Cancelar notificación existente si hay una
      if (app.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(app.notificationId);
      }

      const now = new Date();
      const reminderTime = new Date(app.reminderTime);

      // Verificar si el recordatorio es en el futuro
      if (reminderTime <= now) {
        console.log('El recordatorio ya pasó, no se programa notificación');
        return null;
      }

      // Calcular la diferencia en segundos CORRECTAMENTE
      const secondsUntilReminder = Math.floor((reminderTime.getTime() - now.getTime()) / 1000);

      if (secondsUntilReminder > 0) {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '📅 Recordatorio de cita',
            body: `Tienes una cita: ${app.title} a las ${formatTime(app.date)}`,
            data: { appointmentId: app.id },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            seconds: secondsUntilReminder,
            repeats: false,
            channelId: 'default',
          },
        });
        
        console.log(`Notificación programada para ${formatTime(reminderTime)} (en ${secondsUntilReminder} segundos)`);
        return notificationId;
      } else {
        console.log('El recordatorio ya pasó, no se programa notificación');
        return null;
      }
    } catch (error) {
      console.error('Error al programar notificación:', error);
      return null;
    }
  };

  const saveAppointments = async (apps: Appointment[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
      setAppointments(apps);
    } catch (e) {
      console.error('Error saving appointments:', e);
      Alert.alert('Error', 'No se pudieron guardar las citas');
    }
  };

  const getTypeColor = (type: AppointmentType): string => {
    const colors = {
      personal: '#f8fc0bff',
      work: '#0af5e5fc',
      medical: '#deddfaff',
      urgent: '#f60707ff',
      other: '#41fb0eff',
    };
    return colors[type];
  };

  const getTypeLightColor = (type: AppointmentType): string => {
    const lightColors = {
      personal: '#0c0c0c',
      work: '#0c0c0c',
      medical: '#0c0c0c',
      urgent: '#0c0c0c',
      other: '#0c0c0c',
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

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString();
  };

  const formatReminderText = (app: Appointment): string => {
    if (!app.reminderTime || !app.reminderMinutes) return 'Recordatorio';

    let timeText = '';
    switch (app.reminderMinutes) {
      case 5: timeText = '5 minutos antes'; break;
      case 15: timeText = '15 minutos antes'; break;
      case 30: timeText = '30 minutos antes'; break;
      case 60: timeText = '1 hora antes'; break;
      case 120: timeText = '2 horas antes'; break;
      default: timeText = `${app.reminderMinutes} minutos antes`;
    }
    return `Recordatorio: ${timeText}`;
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Eliminar Cita',
      '¿Estás seguro de que quieres eliminar esta cita?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const appToDelete = appointments.find(app => app.id === id);
            if (appToDelete?.notificationId) {
              await Notifications.cancelScheduledNotificationAsync(appToDelete.notificationId);
            }
            const updatedApps = appointments.filter(app => app.id !== id);
            saveAppointments(updatedApps);
          },
        },
      ]
    );
  };

  const markAsCompleted = async (id: string) => {
    const updatedApps = appointments.map(app => {
      if (app.id === id) {
        if (app.notificationId) {
          Notifications.cancelScheduledNotificationAsync(app.notificationId);
        }
        return { ...app, completed: true, reminder: false, notificationId: undefined };
      }
      return app;
    });
    saveAppointments(updatedApps);
  };

  const setReminder = async (app: Appointment, minutes: number) => {
    try {
      // Calcular el tiempo del recordatorio (fecha de la cita - minutos)
      const reminderTime = new Date(app.date.getTime() - (minutes * 60 * 1000));
      
      console.log('Fecha cita:', app.date);
      console.log('Recordatorio calculado:', reminderTime);
      console.log('Minutos antes:', minutes);

      const notificationId = await schedulePushNotification({
        ...app,
        reminderTime,
        reminder: true,
        reminderMinutes: minutes,
      });

      if (notificationId) {
        const updatedApps = appointments.map(a =>
          a.id === app.id
            ? { ...a, reminder: true, reminderTime, reminderMinutes: minutes, notificationId }
            : a
        );

        saveAppointments(updatedApps);
        setShowReminderModal(false);

        Alert.alert(
          'Recordatorio configurado', 
          `Te recordaremos ${minutes} minutos antes de tu cita.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error', 
          'No se pudo programar el recordatorio. La fecha puede ser en el pasado.'
        );
      }
    } catch (error) {
      console.error('Error al configurar recordatorio:', error);
      Alert.alert('Error', 'No se pudo configurar el recordatorio');
    }
  };

  const filteredAppointments = appointments
    .filter(app => {
      const matchesSearch = app.title.toLowerCase().includes(searchText.toLowerCase()) ||
        app.description.toLowerCase().includes(searchText.toLowerCase());
      const matchesType = filterType === 'all' || app.type === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const AppointmentCard = ({ app }: { app: Appointment }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <View
          style={[
            styles.appointmentCard,
            { borderLeftColor: getTypeColor(app.type) },
            app.completed && styles.completedCard,
          ]}
        >
          <TouchableOpacity
            style={styles.deleteIcon}
            onPress={() => handleDelete(app.id)}
          >
            <Ionicons name="trash" size={20} color="#FF6B6B" />
          </TouchableOpacity>

          <View style={styles.appointmentHeader}>
            <View style={styles.typeIndicator}>
              <Ionicons
                name={getTypeIcon(app.type) as any}
                size={16}
                color={getTypeColor(app.type)}
              />
              <Text style={[styles.typeText, { color: getTypeColor(app.type) }]}>
                {app.type.toUpperCase()}
              </Text>
            </View>
            {app.completed && (
              <View style={styles.completedBadge}>
                <Text style={styles.completedText}>COMPLETADA</Text>
              </View>
            )}
          </View>

          <Text style={styles.appointmentTitle}>{app.title}</Text>
          {app.description && (
            <Text style={styles.appointmentDescription}>{app.description}</Text>
          )}

          <View style={styles.timeContainer}>
            <Ionicons name="time" size={14} color="#ffffff80" />
            <Text style={styles.timeText}>
              {formatDate(app.date)} a las {formatTime(app.date)}
              {app.endDate && ` - ${formatTime(app.endDate)}`}
            </Text>
          </View>

          {app.reminder && app.reminderTime && (
            <View style={styles.reminderContainer}>
              <Ionicons name="notifications" size={14} color="#FFD700" />
              <Text style={styles.reminderText}>
                {formatReminderText(app)}
              </Text>
            </View>
          )}

          <View style={styles.appointmentActions}>
            {!app.completed && (
              <>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedAppointment(app);
                    setShowReminderModal(true);
                  }}
                  style={styles.reminderButton}
                >
                  <Ionicons name="notifications" size={18} color="#FFD700" />
                  <Text style={styles.actionText}>Recordar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => markAsCompleted(app.id)}
                  style={styles.completeButton}
                >
                  <Ionicons name="checkmark" size={18} color="#4ECDC4" />
                  <Text style={styles.actionText}>Completar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#090FFA" />
      <LinearGradient
        colors={['#090FFA', '#0eb9e3', '#58fd03']}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Daily')}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>Mis Citas</Text>

          <TouchableOpacity
            onPress={() => navigation.navigate('Daily')}
            style={styles.newAppointmentButton}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
            <Text style={styles.newAppointmentButtonText}>Nueva</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#aaaaaa" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar citas..."
              placeholderTextColor="#aaaaaa"
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={20} color="#aaaaaa" />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
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
        </View>

        <View style={styles.appointmentsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Todas mis citas
            </Text>
            <Text style={styles.appointmentCount}>
              {filteredAppointments.length} citas
            </Text>
          </View>

          <ScrollView style={styles.appointmentsList}>
            {filteredAppointments.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar" size={48} color="#ffffff80" />
                <Text style={styles.emptyText}>
                  {searchText || filterType !== 'all'
                    ? 'No hay citas que coincidan con la búsqueda'
                    : 'No hay citas programadas'}
                </Text>
                {(searchText || filterType !== 'all') && (
                  <TouchableOpacity
                    style={styles.clearFiltersButton}
                    onPress={() => {
                      setSearchText('');
                      setFilterType('all');
                    }}
                  >
                    <Text style={styles.clearFiltersText}>Limpiar filtros</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredAppointments.map(app => (
                <AppointmentCard key={app.id} app={app} />
              ))
            )}
          </ScrollView>
        </View>

        <Modal
          visible={showReminderModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowReminderModal(false)}
        >
          <View style={styles.reminderModalOverlay}>
            <View style={styles.reminderModalContainer}>
              <Text style={styles.reminderModalTitle}>Configurar Recordatorio</Text>
              <Text style={styles.reminderModalText}>
                ¿Cuándo quieres que te recordemos esta cita?
              </Text>

              <View style={styles.reminderOptions}>
                {[5, 10, 15, 30, 60, 120].map(minutes => (
                  <TouchableOpacity
                    key={minutes}
                    style={styles.reminderOption}
                    onPress={() => selectedAppointment && setReminder(selectedAppointment, minutes)}
                  >
                    <Text style={styles.reminderOptionText}>
                      {minutes} minutos antes
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.reminderCancelButton}
                onPress={() => setShowReminderModal(false)}
              >
                <Text style={styles.reminderCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default AgendaScreen;