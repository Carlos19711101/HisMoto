import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  Image,
  Alert,
  TouchableOpacity,
  StatusBar,
  Easing
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import styles, { CARD_WIDTH, SPACING, MARGIN_HORIZONTAL } from './TodoScreen.styles';

interface CardItem {
  id: string;
  color?: string;
  text?: string;
  title?: string;
  subtitle?: string;
  screenName?: string;
  image?: any;
}

interface TodoScreenProps {
  navigation: {
    navigate: (screenName: string) => void;
  };
}

const TodoScreen: React.FC<TodoScreenProps> = ({ navigation }) => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Animaciones para el botón de ayuda (help2)
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Animaciones para el botón de información (InfoApp)
  const floatAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  // Calcula la altura segura para el StatusBar
  const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 20;

  // Efecto para la animación del botón de ayuda (help2)
  useEffect(() => {
    // Animación de pulso (crece y se encoge) para help2
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        })
      ])
    ).start();

    // Animación de rotación limitada a 30 grados en cada dirección para help2
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ])
    ).start();

    // Animación de flotación (sube y baja) para InfoApp
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        })
      ])
    ).start();

    // Animación de rebote para InfoApp
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1.1,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0.9,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, []);

  // Interpolación para la rotación limitada (-10deg a 10deg) para help2
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-5deg', '5deg']
  });

  // Interpolación para la flotación (sube y baja) para InfoApp
  const floatInterpolate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15] // Se mueve 15px hacia arriba
  });

  // Importar imágenes locales desde assets
  const localCardImages = [
    require('../../assets/imagenTargeta/ProfileScreen3.png'),
    require('../../assets/imagenTargeta/DailyScreen.png'),
    require('../../assets/imagenTargeta/PreventiveScreen1.png'),
    require('../../assets/imagenTargeta/GeneralScreen1.png'),
    require('../../assets/imagenTargeta/EmergencyScreen.png'),
    require('../../assets/imagenTargeta/RouteScreen.png'),
  ];

  const originalCards: CardItem[] = [
    { id: '1', title: 'Profile', subtitle: ' Datos \n     Motocicleta   ', color: '#33ee0d', screenName: 'Profile', image: localCardImages[0] },
    { id: '2', title: 'Daily', subtitle: '  Agéndate  ', color: '#eb0dee', screenName: 'Daily', image: localCardImages[1] },
    { id: '3', title: 'Preventive', subtitle: 'Mantenimiento preventivo', color: '#0deeda', screenName: 'Preventive', image: localCardImages[2] },
    { id: '4', title: 'Maintenancey', subtitle: 'Mantenimiento \n General ', color: '#090FFA', screenName: 'General', image: localCardImages[3] },
    { id: '5', title: 'Emergency', subtitle: 'Percance \nen la Via', color: '#FF5252', screenName: 'Emergency', image: localCardImages[4] },
    { id: '6', title: 'Route', subtitle: '  Rutas \n  recorridos', color: '#810dee', screenName: 'Route', image: localCardImages[5] },
  ];

  const cards = [
    ...originalCards.slice(-1).map(card => ({ ...card, id: `pre-${card.id}` })),
    ...originalCards,
    ...originalCards.slice(0, 1).map(card => ({ ...card, id: `post-${card.id}` })),
  ];

  const totalCards = originalCards.length;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          x: CARD_WIDTH + SPACING * 2,
          animated: false,
        });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / (CARD_WIDTH + SPACING * 2));
    
    if (index >= cards.length - 1) {
      scrollViewRef.current?.scrollTo({ x: CARD_WIDTH + SPACING * 2, animated: false });
    } else if (index <= 0) {
      scrollViewRef.current?.scrollTo({ x: (CARD_WIDTH + SPACING * 2) * (cards.length - 2), animated: false });
    }

    const adjustedIndex = (index - 1 + totalCards) % totalCards;
    setCurrentIndex(adjustedIndex);

    Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })(event);
  };

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / (CARD_WIDTH + SPACING * 2));
    const adjustedIndex = (index - 1 + totalCards) % totalCards;
    setCurrentIndex(adjustedIndex);
  };

  const handleCardPress = (screenName: string | undefined) => {
    if (screenName) {
      navigation.navigate(screenName);
    }
  };

  return (
    <>
      {/* StatusBar transparente */}
      <StatusBar
        translucent={true}
        backgroundColor="transparent"
        barStyle="light-content"
      />
      
      <LinearGradient 
        colors={['#090FFA','#88D3CE', '#6E45E2']} 
        style={[styles.containerGlobal, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}
      >
        <TouchableOpacity 
          style={[styles.backButton, { top: STATUS_BAR_HEIGHT }]} 
          onPress={() => navigation.navigate('Welcome')}
        >
          <AntDesign name="doubleleft" size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.content}> 
          <Text style={styles.title}>Documenta la Historia</Text>
        </View>
        
        {/* Botón con animación para el chatbot (help2) - MANTENIENDO LA ANIMACIÓN ORIGINAL */}
        <View style={styles.content}>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('ChatBots')}
          >
            <Animated.Image
              source={require('../../assets/imagen/help2.png')}
              style={[
                styles.addButton2,
                {
                  transform: [
                    { scale: pulseAnim },
                    { rotate: rotateInterpolate }
                  ]
                }
              ]}
            />
          </TouchableOpacity>
        </View>
        
        {/* Botón de información de la aplicación (InfoApp) - CON NUEVA ANIMACIÓN */}
        <View style={styles.content1}>
          <TouchableOpacity 
            style={styles.addButton3}
            onPress={() => navigation.navigate('Info')}  // Navega a la pantalla de información
          >
            <Animated.Image
              source={require('../../assets/imagen/InfoApp.png')}
              style={[
                styles.addButton4,
                {
                  transform: [
                    { translateY: floatInterpolate },
                    { scale: bounceAnim }
                  ]
                }
              ]}
            />
          </TouchableOpacity>
        </View>
        
        <View style={styles.container}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            decelerationRate={Platform.OS === 'ios' ? 0.99 : 0.95}
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + SPACING * 2}
            contentContainerStyle={styles.scrollContainer}
            onScroll={handleScroll}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            scrollEventThrottle={16}
            directionalLockEnabled={true}
            alwaysBounceHorizontal={false}
            bounces={false}
            overScrollMode="never"
          >
            {cards.map((card, index) => {
              const inputRange = [
                (index - 1) * (CARD_WIDTH + SPACING * 2),
                index * (CARD_WIDTH + SPACING * 2),
                (index + 1) * (CARD_WIDTH + SPACING * 2),
              ];
              const scale = scrollX.interpolate({ inputRange, outputRange: [0.8, 0.9, 0.8], extrapolate: 'clamp' });
              const opacity = scrollX.interpolate({ inputRange, outputRange: [0.5, 1, 0.5], extrapolate: 'clamp' });

              return (
                <TouchableOpacity key={card.id} activeOpacity={0.8} onPress={() => handleCardPress(card.screenName)}>
                  <Animated.View
                    style={[
                      styles.card,
                      {
                        width: CARD_WIDTH,
                        backgroundColor: card.color,
                        transform: [{ scale }],
                        opacity,
                        marginLeft: index === 0 ? MARGIN_HORIZONTAL : SPACING,
                        marginRight: index === cards.length - 1 ? MARGIN_HORIZONTAL : SPACING,
                        overflow: 'hidden',
                      },
                    ]}
                  >
                    {card.image && (
                      <Image 
                        source={card.image} 
                        style={styles.cardImage} 
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.textContainer}>
                      <Text style={styles.cardTitle}>{card.title}</Text>
                      <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
                    </View>
                  </Animated.View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={styles.pagination}>
            {originalCards.map((_, index) => (
              <View key={index} style={[ styles.paginationDot, currentIndex === index && styles.paginationDotActive ]} />
            ))}
          </View>
        </View>
      </LinearGradient>
    </>
  );
};

export default TodoScreen;