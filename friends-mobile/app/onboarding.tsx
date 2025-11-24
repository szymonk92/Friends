import CenteredContainer from '@/components/CenteredContainer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router } from 'expo-router';
import { Stack } from 'expo-router';
import { Dimensions, View, Image, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const ONBOARDING_COMPLETE_KEY = 'onboarding_completed';

interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
  features: string[];
}

const steps: OnboardingStep[] = [
  {
    title: 'Welcome to Friends',
    description: 'Your personal CRM for managing relationships',
    icon: 'account-group',
    features: [
      'Remember important details about people',
      'Track preferences, likes, and dislikes',
      'Never forget a birthday or important event',
      'Store sensitive information securely',
    ],
  },
  {
    title: 'Add Stories',
    description: 'Write down conversations and experiences',
    icon: 'book-open-page-variant',
    features: [
      'Record interactions as you have them',
      'AI extracts people and details automatically',
      'Build a knowledge base over time',
      'Search and recall information easily',
    ],
  },
  {
    title: 'Manage People',
    description: 'Organize your contacts with rich details',
    icon: 'account-details',
    features: [
      'Add friends, family, and colleagues',
      'Track their preferences and interests',
      'Note dietary restrictions and allergies',
      'Tag and categorize for easy filtering',
    ],
  },
  {
    title: 'Secure Secrets',
    description: 'Protect sensitive information',
    icon: 'shield-lock',
    features: [
      'Biometric or password protection',
      'End-to-end encryption on device',
      'Auto-clear after viewing',
      'Associate secrets with people',
    ],
  },
  {
    title: 'Get Started',
    description: 'You\'re all set to begin!',
    icon: 'rocket-launch',
    features: [
      'Add your first story or person',
      'Explore the app features',
      'Configure AI extraction in Settings',
      'Set up secrets protection when ready',
    ],
  },
];

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const insets = useSafeAreaInsets();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      router.replace('/');
    } catch (error) {
      console.error('Failed to save onboarding state:', error);
      router.replace('/');
    }
  };

  const handleSkip = async () => {
    await handleComplete();
  };

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        {/* Skip button */}
        {!isLastStep && (
          <Button mode="text" onPress={handleSkip} style={styles.skipButton}>
            Skip
          </Button>
        )}

        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[styles.progressDot, index === currentStep && styles.progressDotActive]}
            />
          ))}
        </View>

        {/* Content */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <CenteredContainer style={styles.content}>
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                {step.icon === 'account-group' ? (
                  <Image
                    source={require('@/assets/images/icon.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Text variant="displaySmall" style={styles.icon}>
                    {step.icon === 'book-open-page-variant' && '📖'}
                    {step.icon === 'account-details' && '👤'}
                    {step.icon === 'shield-lock' && '🔒'}
                    {step.icon === 'rocket-launch' && '🚀'}
                  </Text>
                )}

                <Text variant="headlineMedium" style={styles.title}>
                  {step.title}
                </Text>

                <Text variant="bodyLarge" style={styles.description}>
                  {step.description}
                </Text>

                <View style={styles.featureList}>
                  {step.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Text style={styles.featureBullet}>•</Text>
                      <Text variant="bodyMedium" style={styles.featureText}>
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card.Content>
            </Card>
          </CenteredContainer>
        </ScrollView>

        {/* Navigation */}
        <View style={styles.navigation}>
          {currentStep > 0 ? (
            <Button mode="outlined" onPress={handlePrevious} style={styles.navButton}>
              Previous
            </Button>
          ) : (
            <View style={styles.navButton} />
          )}

          {isLastStep ? (
            <Button mode="contained" onPress={handleComplete} style={styles.navButton}>
              Get Started
            </Button>
          ) : (
            <Button mode="contained" onPress={handleNext} style={styles.navButton}>
              Next
            </Button>
          )}
        </View>

        <Text variant="bodySmall" style={styles.stepIndicator}>
          {currentStep + 1} of {steps.length}
        </Text>
      </View>
    </>
  );
}

export async function checkOnboardingComplete(): Promise<boolean> {
  try {
    const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
    return completed === 'true';
  } catch {
    return false;
  }
}

export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
  } catch (error) {
    console.error('Failed to reset onboarding:', error);
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingBottom: 20,
  },
  skipButton: {
    position: 'absolute',
    top: 10,
    right: 16,
    zIndex: 10,
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ccc',
  },
  progressDotActive: {
    backgroundColor: '#6200ee',
    width: 24,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  card: {
    padding: 16,
    maxHeight: height * 0.65,
  },
  cardContent: {
    alignItems: 'center',
  },
  icon: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
    fontSize: 24,
  },
  description: {
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 20,
    fontSize: 16,
  },
  featureList: {
    width: '100%',
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureBullet: {
    fontSize: 18,
    marginRight: 8,
    color: '#6200ee',
    fontWeight: 'bold',
  },
  featureText: {
    flex: 1,
    lineHeight: 20,
    fontSize: 14,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 16,
  },
  navButton: {
    minWidth: 120,
  },
  stepIndicator: {
    textAlign: 'center',
    marginTop: 12,
    opacity: 0.6,
  },
});
