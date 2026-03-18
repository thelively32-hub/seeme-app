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

  // Show video on all platforms
  const showVideo = videoSource && !videoError;
  const showImage = !showVideo || !videoLoaded;

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setVideoLoaded(true);
    }
  };

  const handleVideoError = () => {
    console.log('Video error, showing fallback image');
    setVideoError(true);
  };

  return (
    <View style={styles.container}>
      {/* Fallback Image (shown while video loads or on error) */}
      {imageSource && showImage && (
        <Image
          source={typeof imageSource === 'number' ? imageSource : { uri: imageSource as string }}
          style={styles.media}
          resizeMode="cover"
        />
      )}

      {/* Video - fullscreen, autoplay, muted, loop */}
      {showVideo && (
        <Video
          ref={videoRef}
          source={typeof videoSource === 'string' ? { uri: videoSource } : videoSource}
          style={[styles.media, styles.video, !videoLoaded && styles.hidden]}
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
            `rgba(0, 0, 0, ${overlayOpacity * 0.2})`,
            `rgba(0, 0, 0, ${overlayOpacity * 0.5})`,
            `rgba(0, 0, 0, ${overlayOpacity * 0.8})`,
          ]}
          locations={[0, 0.4, 1]}
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
  video: {
    // Ensure video covers the entire screen
    minWidth: '100%',
    minHeight: '100%',
  },
  hidden: {
    opacity: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
