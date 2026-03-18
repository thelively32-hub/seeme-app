import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface BackgroundMediaProps {
  videoSource?: string | { uri: string };
  imageSource?: string | { uri: string } | number;
  overlayOpacity?: number;
  overlayGradient?: boolean;
}

export default function BackgroundMedia({
  videoSource,
  imageSource,
  overlayOpacity = 0.4,
  overlayGradient = true,
}: BackgroundMediaProps) {
  const videoRef = useRef<Video>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Determine if we should show video or fallback to image
  const showVideo = videoSource && !videoError && Platform.OS !== 'web';
  const showImage = !showVideo || !videoLoaded;

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setVideoLoaded(true);
    }
  };

  const handleVideoError = () => {
    setVideoError(true);
  };

  return (
    <View style={styles.container}>
      {/* Fallback Image (always rendered, hidden when video loads) */}
      {imageSource && showImage && (
        <Image
          source={typeof imageSource === 'number' ? imageSource : { uri: imageSource as string }}
          style={styles.media}
          resizeMode="cover"
          blurRadius={Platform.OS === 'ios' ? 2 : 1}
        />
      )}

      {/* Video (only on native, not web) */}
      {showVideo && (
        <Video
          ref={videoRef}
          source={typeof videoSource === 'string' ? { uri: videoSource } : videoSource}
          style={[styles.media, !videoLoaded && styles.hidden]}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onError={handleVideoError}
        />
      )}

      {/* Dark Overlay */}
      {overlayGradient ? (
        <LinearGradient
          colors={[
            `rgba(0, 0, 0, ${overlayOpacity * 0.3})`,
            `rgba(0, 0, 0, ${overlayOpacity * 0.6})`,
            `rgba(0, 0, 0, ${overlayOpacity})`,
          ]}
          locations={[0, 0.5, 1]}
          style={styles.overlay}
        />
      ) : (
        <View style={[styles.overlay, { backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a0a',
  },
  media: {
    width,
    height,
    position: 'absolute',
  },
  hidden: {
    opacity: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
