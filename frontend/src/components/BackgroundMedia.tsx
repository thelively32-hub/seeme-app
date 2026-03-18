import React, { useState, useRef } from 'react';
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

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded && status.isPlaying) {
      setVideoLoaded(true);
    }
  };

  const handleVideoError = (error: any) => {
    console.log('Video error:', error);
    setVideoError(true);
  };

  // Always try to show video first
  const showVideo = videoSource && !videoError;
  // Show image only if video hasn't loaded yet or errored
  const showFallbackImage = imageSource && (!videoLoaded || videoError);

  return (
    <View style={styles.container}>
      {/* Fallback Image - NO BLUR */}
      {showFallbackImage && (
        <Image
          source={typeof imageSource === 'number' ? imageSource : { uri: imageSource as string }}
          style={styles.media}
          resizeMode="cover"
        />
      )}

      {/* Video - Full quality, vertical video */}
      {showVideo && (
        <Video
          ref={videoRef}
          source={typeof videoSource === 'string' ? { uri: videoSource } : videoSource}
          style={styles.media}
          resizeMode={ResizeMode.COVER}
          shouldPlay={true}
          isLooping={true}
          isMuted={true}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onError={handleVideoError}
          useNativeControls={false}
        />
      )}

      {/* Dark Overlay for text readability */}
      {overlayGradient ? (
        <LinearGradient
          colors={[
            `rgba(0, 0, 0, ${overlayOpacity * 0.15})`,
            `rgba(0, 0, 0, ${overlayOpacity * 0.4})`,
            `rgba(0, 0, 0, ${overlayOpacity * 0.7})`,
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
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  media: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
