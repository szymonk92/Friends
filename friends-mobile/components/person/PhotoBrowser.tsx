import { useState } from 'react';
import {
    StyleSheet,
    View,
    Modal,
    Dimensions,
    TouchableOpacity,
    Alert,
    FlatList,
    ViewToken,
} from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
} from 'react-native-reanimated';

interface Photo {
    id: string;
    filePath: string;
}

interface PhotoBrowserProps {
    visible: boolean;
    photos: Photo[];
    initialIndex?: number;
    currentPhotoId?: string | null;
    onClose: () => void;
    onSetAsProfile: (photoId: string) => void;
    onDelete: (photoId: string) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PhotoBrowser({
    visible,
    photos,
    initialIndex = 0,
    currentPhotoId,
    onClose,
    onSetAsProfile,
    onDelete,
}: PhotoBrowserProps) {
    const theme = useTheme();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    const handleViewableItemsChanged = ({
        viewableItems,
    }: {
        viewableItems: ViewToken<Photo>[];
    }) => {
        if (viewableItems.length > 0 && viewableItems[0].index !== null) {
            setCurrentIndex(viewableItems[0].index);
        }
    };

    const handleOptions = () => {
        const photo = photos[currentIndex];
        if (!photo) return;

        Alert.alert('Photo Options', 'What would you like to do?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Set as Profile',
                onPress: () => onSetAsProfile(photo.id),
            },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    onDelete(photo.id);
                    if (photos.length === 1) {
                        onClose();
                    }
                },
            },
        ]);
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={[styles.container, { backgroundColor: 'rgba(0, 0, 0, 0.95)' }]}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
                    <IconButton icon="close" iconColor="#fff" size={24} onPress={onClose} />
                    <Text variant="titleMedium" style={styles.counter}>
                        {currentIndex + 1} / {photos.length}
                    </Text>
                    <IconButton icon="dots-vertical" iconColor="#fff" size={24} onPress={handleOptions} />
                </View>

                {/* Photo viewer with horizontal scroll */}
                <FlatList
                    data={photos}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item.id}
                    initialScrollIndex={initialIndex}
                    getItemLayout={(_, index) => ({
                        length: SCREEN_WIDTH,
                        offset: SCREEN_WIDTH * index,
                        index,
                    })}
                    onViewableItemsChanged={handleViewableItemsChanged}
                    viewabilityConfig={{
                        itemVisiblePercentThreshold: 50,
                    }}
                    renderItem={({ item }) => (
                        <ZoomableImage uri={item.filePath} isProfile={item.id === currentPhotoId} />
                    )}
                />

                {/* Footer with profile indicator */}
                {photos[currentIndex]?.id === currentPhotoId && (
                    <View style={[styles.footer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
                        <IconButton icon="account-check" iconColor="#4caf50" size={20} />
                        <Text variant="bodySmall" style={styles.profileText}>
                            Profile Photo
                        </Text>
                    </View>
                )}
            </View>
        </Modal>
    );
}

interface ZoomableImageProps {
    uri: string;
    isProfile: boolean;
}

function ZoomableImage({ uri }: ZoomableImageProps) {
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            if (scale.value < 1) {
                scale.value = withSpring(1);
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
                savedScale.value = 1;
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
            } else {
                savedScale.value = scale.value;
            }
        });

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            if (scale.value > 1) {
                translateX.value = savedTranslateX.value + e.translationX;
                translateY.value = savedTranslateY.value + e.translationY;
            }
        })
        .onEnd(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        });

    const doubleTap = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            if (scale.value > 1) {
                scale.value = withTiming(1);
                translateX.value = withTiming(0);
                translateY.value = withTiming(0);
                savedScale.value = 1;
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
            } else {
                scale.value = withTiming(2);
                savedScale.value = 2;
            }
        });

    const composed = Gesture.Simultaneous(pinchGesture, panGesture, doubleTap);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    return (
        <View style={styles.imageContainer}>
            <GestureDetector gesture={composed}>
                <Animated.View style={[styles.imageWrapper, animatedStyle]}>
                    <Image
                        source={{ uri }}
                        style={styles.image}
                        contentFit="contain"
                        transition={{ duration: 200 }}
                    />
                </Animated.View>
            </GestureDetector>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 40,
        paddingHorizontal: 8,
        zIndex: 10,
    },
    counter: {
        color: '#fff',
        fontWeight: '600',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 40,
        paddingHorizontal: 16,
        zIndex: 10,
    },
    profileText: {
        color: '#4caf50',
        fontWeight: '600',
    },
    imageContainer: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageWrapper: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    image: {
        width: '100%',
        height: '100%',
    },
});
