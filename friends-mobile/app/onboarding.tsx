import CenteredContainer from '@/components/CenteredContainer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useRef } from 'react';
import { router, Stack } from 'expo-router';
import {
  View,
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text as RNText,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { BookOpenIcon, UserIcon, LockIcon, RocketIcon } from 'phosphor-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { devLogger } from '@/lib/utils/devLogger';
import { fz, fzText } from '@/lib/design/tokens';

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
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.iconContainer}>
              {item.icon === 'account-group' && (
                <Image
                  source={require('@/assets/images/icon.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              )}
              {item.icon === 'book-open-page-variant' && (
                <BookOpenIcon size={56} color={fz.ink} weight="bold" />
              )}
              {item.icon === 'account-details' && (
                <UserIcon size={56} color={fz.ink} weight="bold" />
              )}
              {item.icon === 'shield-lock' && (
                <LockIcon size={56} color={fz.ink} weight="bold" />
              )}
              {item.icon === 'rocket-launch' && (
                <RocketIcon size={56} color={fz.ink} weight="bold" />
              )}
            </View>

            <RNText style={styles.title}>{item.title}</RNText>
            <RNText style={styles.description}>{item.description}</RNText>

            <View style={styles.featureList}>
              {item.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <RNText style={styles.featureBullet}>•</RNText>
                  <RNText style={styles.featureText}>{feature}</RNText>
                </View>
              ))}
            </View>
          </View>
        </View>
      </CenteredContainer>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
      >
        {/* Skip button */}
        {!isLastStep && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton} hitSlop={12} activeOpacity={0.6}>
            <RNText style={fzText.label}>{t('onboarding.skip')}</RNText>
          </TouchableOpacity>
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
            <TouchableOpacity
              onPress={handlePrevious}
              style={[styles.navButton, styles.navButtonOutline]}
              activeOpacity={0.7}
            >
              <RNText style={fzText.btnOutline}>{t('common.previous')}</RNText>
            </TouchableOpacity>
          ) : (
            <View style={styles.navButton} />
          )}

          {isLastStep ? (
            <TouchableOpacity
              onPress={handleComplete}
              style={[styles.navButton, styles.navButtonSolid]}
              activeOpacity={0.8}
            >
              <RNText style={fzText.btn}>{t('common.getStarted')}</RNText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleNext}
              style={[styles.navButton, styles.navButtonSolid]}
              activeOpacity={0.8}
            >
              <RNText style={fzText.btn}>{t('common.next')}</RNText>
            </TouchableOpacity>
          )}
        </View>

        <RNText style={styles.stepIndicator}>
          {t('onboarding.stepIndicator', { current: currentStep + 1, total: steps.length })}
        </RNText>
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
    backgroundColor: fz.paper,
  },
  skipButton: {
    position: 'absolute',
    top: 10,
    right: fz.s.edge,
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
    marginBottom: fz.s.lg,
    marginTop: 40, // Added to clear the skip button area
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: fz.lineDim,
  },
  progressDotActive: {
    backgroundColor: fz.ink,
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
    paddingBottom: fz.s.lg,
    width: '100%',
  },
  card: {
    backgroundColor: fz.card,
    borderRadius: fz.rCard,
    borderWidth: 1,
    borderColor: fz.cardBorder,
    padding: fz.s.lg,
    width: '100%',
  },
  cardContent: {
    alignItems: 'center',
  },
  iconContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: fz.s.lg,
  },
  title: {
    ...fzText.titleLg,
    textAlign: 'center',
    marginBottom: fz.s.sm,
  },
  description: {
    ...fzText.body,
    textAlign: 'center',
    marginBottom: 20,
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
    ...fzText.body,
    fontSize: 18,
    marginRight: 8,
    color: fz.ink,
    fontWeight: '700',
  },
  featureText: {
    ...fzText.body,
    flex: 1,
    lineHeight: 20,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: fz.s.lg,
  },
  navButton: {
    height: 48,
    minWidth: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: fz.rButton,
    paddingHorizontal: 24,
  },
  navButtonOutline: {
    borderWidth: 1.5,
    borderColor: fz.outline,
  },
  navButtonSolid: {
    backgroundColor: fz.ink,
  },
  stepIndicator: {
    ...fzText.time,
    textAlign: 'center',
    marginTop: fz.s.md,
  },
});