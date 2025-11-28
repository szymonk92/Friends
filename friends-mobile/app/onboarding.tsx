import CenteredContainer from '@/components/CenteredContainer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useRef } from 'react';
import { router } from 'expo-router';
import { Stack } from 'expo-router';
import { View, Image, StyleSheet, FlatList, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { devLogger } from '@/lib/utils/devLogger';

const ONBOARDING_COMPLETE_KEY = 'onboarding_completed';

interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
  features: string[];
}

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);

  // Create steps from translations
  const steps: OnboardingStep[] = [
    {
      title: t('onboarding.step1.title'),
      description: t('onboarding.step1.description'),
      icon: 'account-group',
      features: [
        t('onboarding.step1.feature1'),
        t('onboarding.step1.feature2'),
        t('onboarding.step1.feature3'),
        t('onboarding.step1.feature4'),
      ],
    },
    {
      title: t('onboarding.step2.title'),
      description: t('onboarding.step2.description'),
      icon: 'book-open-page-variant',
      features: [
        t('onboarding.step2.feature1'),
        t('onboarding.step2.feature2'),
        t('onboarding.step2.feature3'),
        t('onboarding.step2.feature4'),
      ],
    },
    {
      title: t('onboarding.step3.title'),
      description: t('onboarding.step3.description'),
      icon: 'account-details',
      features: [
        t('onboarding.step3.feature1'),
        t('onboarding.step3.feature2'),
        t('onboarding.step3.feature3'),
        t('onboarding.step3.feature4'),
      ],
    },
    {
      title: t('onboarding.step4.title'),
      description: t('onboarding.step4.description'),
      icon: 'shield-lock',
      features: [
        t('onboarding.step4.feature1'),
        t('onboarding.step4.feature2'),
        t('onboarding.step4.feature3'),
        t('onboarding.step4.feature4'),
      ],
    },
    {
      title: t('onboarding.step5.title'),
      description: t('onboarding.step5.description'),
      icon: 'rocket-launch',
      features: [
        t('onboarding.step5.feature1'),
        t('onboarding.step5.feature2'),
        t('onboarding.step5.feature3'),
        t('onboarding.step5.feature4'),
      ],
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentStep + 1,
        animated: true,
      });
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      flatListRef.current?.scrollToIndex({
        index: currentStep - 1,
        animated: true,
      });
      setCurrentStep(currentStep - 1);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffsetX / width);
    if (currentIndex !== currentStep) {
      setCurrentStep(currentIndex);
    }
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      router.replace('/');
    } catch (error) {
      devLogger.error('Failed to save onboarding state', error);
      router.replace('/');
    }
  };

  const handleSkip = async () => {
    await handleComplete();
  };

  const isLastStep = currentStep === steps.length - 1;

  const renderItem = ({ item }: { item: OnboardingStep }) => (
    <View style={[styles.slide, { width }]}>
      <CenteredContainer style={styles.content}>
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.iconContainer}>
              {item.icon === 'account-group' ? (
                <Image
                  source={require('@/assets/images/icon.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              ) : (
                <Text variant="displaySmall" style={styles.icon}>
                  {item.icon === 'book-open-page-variant' && '📖'}
                  {item.icon === 'account-details' && '👤'}
                  {item.icon === 'shield-lock' && '🔒'}
                  {item.icon === 'rocket-launch' && '🚀'}
                </Text>
              )}
            </View>

            <Text variant="headlineMedium" style={styles.title}>
              {item.title}
            </Text>

            <Text variant="bodyLarge" style={styles.description}>
              {item.description}
            </Text>

            <View style={styles.featureList}>
              {item.features.map((feature, index) => (
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
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        {/* Skip button */}
        {!isLastStep && (
          <Button mode="text" onPress={handleSkip} style={styles.skipButton}>
            {t('onboarding.skip')}
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
        <FlatList
          ref={flatListRef}
          data={steps}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          keyExtractor={(_, index) => index.toString()}
          style={styles.flatList}
        />

        {/* Navigation */}
        <View style={styles.navigation}>
          {currentStep > 0 ? (
            <Button mode="outlined" onPress={handlePrevious} style={styles.navButton}>
              {t('common.previous')}
            </Button>
          ) : (
            <View style={styles.navButton} />
          )}

          {isLastStep ? (
            <Button mode="contained" onPress={handleComplete} style={styles.navButton}>
              {t('common.getStarted')}
            </Button>
          ) : (
            <Button mode="contained" onPress={handleNext} style={styles.navButton}>
              {t('common.next')}
            </Button>
          )}
        </View>

        <Text variant="bodySmall" style={styles.stepIndicator}>
          {t('onboarding.stepIndicator', { current: currentStep + 1, total: steps.length })}
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
    devLogger.error('Failed to reset onboarding', error);
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    marginTop: 40, // Added to clear the skip button area
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
  flatList: {
    flexGrow: 1,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    width: '100%',
  },
  card: {
    padding: 16,
    width: '100%',
  },
  cardContent: {
    alignItems: 'center',
  },
  iconContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 56,
    lineHeight: 70,
    textAlign: 'center',
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
