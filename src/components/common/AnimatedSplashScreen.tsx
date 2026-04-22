import React, { useEffect } from 'react';
import { View, Text, Image, Dimensions, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay, 
  withSequence,
  withSpring,
  runOnJS,
  FadeIn
} from 'react-native-reanimated';
import { LinearGradient } from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

interface AnimatedSplashScreenProps {
  onAnimationComplete: () => void;
}

export const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({ onAnimationComplete }) => {
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const bgOpacity = useSharedValue(1);

  useEffect(() => {
    // 1. Logo pop in
    logoScale.value = withSpring(1, { damping: 12 });
    logoOpacity.value = withTiming(1, { duration: 800 });

    // 2. Text slide up
    textOpacity.value = withDelay(600, withTiming(1, { duration: 800 }));
    textTranslateY.value = withDelay(600, withTiming(0, { duration: 800 }));

    // 3. Exit animation
    const timeout = setTimeout(() => {
      bgOpacity.value = withTiming(0, { duration: 800 }, (finished) => {
        if (finished) {
          runOnJS(onAnimationComplete)();
        }
      });
    }, 2500);

    return () => clearTimeout(timeout);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <LinearGradient
        colors={['#000d1a', '#001a33', '#000d1a']}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <Image 
            source={require('../../../assets/icon.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
        
        <Animated.View style={[styles.textContainer, textStyle]}>
          <Text style={styles.title}>SpendWise</Text>
          <Text style={styles.subtitle}>Smart Finance for Smart People</Text>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>SECURE & PRIVATE</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: '#000d1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
  },
  footerText: {
    color: '#334155',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});
