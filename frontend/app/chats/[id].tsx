import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Keyboard,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import api from '../../src/services/api';
import COLORS from '../../src/theme/colors';
import { getVibeById } from '../../src/constants/vibes';
import { useAuth } from '../../src/context/AuthContext';

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  image_url?: string;
  message_type?: string;
  created_at: string;
  is_mine: boolean;
}

interface ChatDetail {
  id: string;
  participants: Array<{
    id: string;
    name: string;
    photo_url?: string;
  }>;
  other_user: {
    id: string;
    name: string;
    photo_url?: string;
  };
  vibe_type?: string;
  messages: Message[];
  created_at: string;
  expires_at: string;
  time_remaining_seconds: number;
  time_remaining_hours: number;
  is_expired: boolean;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { id: chatId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [chat, setChat] = useState<ChatDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const loadChat = async () => {
    try {
      const data = await api.getChat(chatId);
      setChat(data);
      setTimeRemaining(data.time_remaining_seconds);
    } catch (error) {
      console.error('Failed to load chat:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadChat();
      const interval = setInterval(loadChat, 10000); // Refresh every 10s
      return () => clearInterval(interval);
    }, [chatId])
  );

  // Countdown timer
  useEffect(() => {
    if (timeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeRemaining]);

  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return 'Chat expirado';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${mins}m restantes`;
    if (mins > 0) return `${mins}m ${secs}s restantes`;
    return `${secs}s restantes`;
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSend = async () => {
    if (!message.trim() || sending || chat?.is_expired) return;
    
    const content = message.trim();
    setMessage('');
    setSending(true);
    Keyboard.dismiss();

    try {
      const newMsg = await api.sendMessage(chatId, content);
      setChat(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...prev.messages, { ...newMsg, is_mine: true }],
        };
      });
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessage(content); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const pickImage = async (useCamera: boolean) => {
    setShowImageOptions(false);
    
    try {
      // Request permissions
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso necesario', 'Necesitamos acceso a la cámara para tomar fotos');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para seleccionar fotos');
          return;
        }
      }

      const result = useCamera 
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
            base64: true,
          });

      if (!result.canceled && result.assets[0].base64) {
        await sendImageMessage(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const sendImageMessage = async (base64Image: string) => {
    if (chat?.is_expired) return;
    
    setUploadingImage(true);
    
    try {
      // First upload to Cloudinary
      const uploadResult = await api.uploadImage(base64Image, 'chat_images');
      
      if (!uploadResult.url) {
        throw new Error('Failed to get image URL');
      }

      // Then send as message
      const newMsg = await api.sendImageMessage(chatId, uploadResult.url);
      
      setChat(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...prev.messages, { ...newMsg, is_mine: true }],
        };
      });
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error: any) {
      console.error('Failed to send image:', error);
      Alert.alert('Error', error.message || 'No se pudo enviar la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMine = item.is_mine;
    const showAvatar = !isMine && (index === 0 || chat?.messages[index - 1]?.sender_id !== item.sender_id);
    const isImage = item.message_type === 'image' || item.image_url;

    return (
      <View style={[styles.messageRow, isMine && styles.messageRowMine]}>
        {!isMine && (
          <View style={[styles.avatarSpace, !showAvatar && styles.avatarHidden]}>
            {showAvatar && (
              chat?.other_user.photo_url ? (
                <Image source={{ uri: chat.other_user.photo_url }} style={styles.messageAvatar} />
              ) : (
                <View style={styles.messageAvatarPlaceholder}>
                  <Text style={styles.messageAvatarText}>
                    {chat?.other_user.name?.charAt(0) || '?'}
                  </Text>
                </View>
              )
            )}
          </View>
        )}
        
        {isImage && item.image_url ? (
          <TouchableOpacity 
            style={[styles.imageBubble, isMine ? styles.imageBubbleMine : styles.imageBubbleOther]}
            onPress={() => setSelectedImage(item.image_url || null)}
          >
            <Image 
              source={{ uri: item.image_url }} 
              style={styles.messageImage}
              resizeMode="cover"
            />
            {item.content ? (
              <Text style={[styles.imageCaption, isMine && styles.imageCaptionMine]}>
                {item.content}
              </Text>
            ) : null}
            <Text style={[styles.messageTime, isMine && styles.messageTimeMine]}>
              {formatMessageTime(item.created_at)}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.messageBubble, isMine ? styles.messageBubbleMine : styles.messageBubbleOther]}>
            <Text style={[styles.messageText, isMine && styles.messageTextMine]}>
              {item.content}
            </Text>
            <Text style={[styles.messageTime, isMine && styles.messageTimeMine]}>
              {formatMessageTime(item.created_at)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const vibe = chat?.vibe_type ? getVibeById(chat.vibe_type) : null;
  const isExpiringSoon = timeRemaining > 0 && timeRemaining < 3600;

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.background.primary, COLORS.background.secondary]}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={COLORS.gold.primary} style={{ flex: 1 }} />
      </View>
    );
  }

  if (!chat) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.background.primary, COLORS.background.secondary]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.text.muted} />
          <Text style={styles.errorText}>Chat no encontrado</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background.primary, COLORS.background.secondary]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.text.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.headerCenter}
          onPress={() => router.push(`/user/${chat.other_user.id}`)}
        >
          {chat.other_user.photo_url ? (
            <Image source={{ uri: chat.other_user.photo_url }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerAvatarText}>
                {chat.other_user.name?.charAt(0) || '?'}
              </Text>
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{chat.other_user.name}</Text>
            {vibe && (
              <View style={styles.headerVibe}>
                <Text style={styles.headerVibeEmoji}>{vibe.icon}</Text>
                <Text style={styles.headerVibeText}>{vibe.labelEs}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.placeholder} />
      </View>

      {/* Timer Banner */}
      <View style={[styles.timerBanner, isExpiringSoon && styles.timerBannerUrgent]}>
        <Ionicons
          name="time-outline"
          size={16}
          color={isExpiringSoon ? '#FF6B6B' : COLORS.gold.primary}
        />
        <Text style={[
          styles.timerText,
          isExpiringSoon && styles.timerTextUrgent
        ]}>
          {formatTimeRemaining(timeRemaining)}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={chat.messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Text style={styles.emptyMessagesText}>
                ¡Empieza la conversación! {vibe?.icon || '👋'}
              </Text>
            </View>
          }
        />

        {/* Input */}
        {chat.is_expired ? (
          <View style={[styles.expiredBanner, { paddingBottom: insets.bottom + 16 }]}>
            <Ionicons name="lock-closed" size={20} color={COLORS.text.muted} />
            <Text style={styles.expiredText}>Este chat ha expirado</Text>
          </View>
        ) : (
          <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
            {/* Camera/Gallery Button */}
            <TouchableOpacity
              style={styles.mediaButton}
              onPress={() => setShowImageOptions(true)}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color={COLORS.gold.primary} />
              ) : (
                <Ionicons name="camera" size={24} color={COLORS.gold.primary} />
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              value={message}
              onChangeText={setMessage}
              placeholder="Escribe un mensaje..."
              placeholderTextColor={COLORS.text.muted}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!message.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={COLORS.text.dark} />
              ) : (
                <Ionicons name="send" size={20} color={COLORS.text.dark} />
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Image Options Modal */}
      <Modal
        visible={showImageOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImageOptions(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowImageOptions(false)}>
          <View style={[styles.imageOptionsModal, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Enviar foto</Text>
            
            <TouchableOpacity style={styles.optionButton} onPress={() => pickImage(true)}>
              <View style={[styles.optionIcon, { backgroundColor: '#4CAF5020' }]}>
                <Ionicons name="camera" size={24} color="#4CAF50" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Tomar selfie</Text>
                <Text style={styles.optionSubtitle}>Usa la cámara para tomar una foto</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionButton} onPress={() => pickImage(false)}>
              <View style={[styles.optionIcon, { backgroundColor: '#2196F320' }]}>
                <Ionicons name="images" size={24} color="#2196F3" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Galería</Text>
                <Text style={styles.optionSubtitle}>Selecciona una foto de tu galería</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => setShowImageOptions(false)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Full Image Preview Modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <Pressable style={styles.imagePreviewOverlay} onPress={() => setSelectedImage(null)}>
          <TouchableOpacity style={styles.closePreviewButton} onPress={() => setSelectedImage(null)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image 
              source={{ uri: selectedImage }} 
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gold.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
  headerInfo: {
    marginLeft: 12,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  headerVibe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  headerVibeEmoji: {
    fontSize: 12,
  },
  headerVibeText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  placeholder: {
    width: 44,
  },
  timerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(244, 197, 66, 0.1)',
    gap: 6,
  },
  timerBannerUrgent: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  timerText: {
    fontSize: 13,
    color: COLORS.gold.primary,
    fontWeight: '500',
  },
  timerTextUrgent: {
    color: '#FF6B6B',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  avatarSpace: {
    width: 32,
    marginRight: 8,
  },
  avatarHidden: {
    opacity: 0,
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  messageAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gold.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.dark,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
  },
  messageBubbleOther: {
    backgroundColor: COLORS.background.card,
    borderBottomLeftRadius: 4,
  },
  messageBubbleMine: {
    backgroundColor: COLORS.gold.primary,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  messageTextMine: {
    color: COLORS.text.dark,
  },
  messageTime: {
    fontSize: 11,
    color: COLORS.text.muted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeMine: {
    color: 'rgba(0, 0, 0, 0.5)',
  },
  // Image message styles
  imageBubble: {
    maxWidth: '75%',
    borderRadius: 18,
    overflow: 'hidden',
  },
  imageBubbleOther: {
    backgroundColor: COLORS.background.card,
    borderBottomLeftRadius: 4,
  },
  imageBubbleMine: {
    backgroundColor: COLORS.gold.primary,
    borderBottomRightRadius: 4,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    margin: 4,
  },
  imageCaption: {
    fontSize: 14,
    color: COLORS.text.primary,
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  imageCaptionMine: {
    color: COLORS.text.dark,
  },
  emptyMessages: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyMessagesText: {
    fontSize: 16,
    color: COLORS.text.muted,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    backgroundColor: COLORS.background.primary,
  },
  mediaButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    color: COLORS.text.primary,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.gold.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.background.card,
  },
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    backgroundColor: COLORS.background.primary,
  },
  expiredText: {
    fontSize: 15,
    color: COLORS.text.muted,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 18,
    color: COLORS.text.muted,
    marginTop: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  imageOptionsModal: {
    backgroundColor: COLORS.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border.light,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    marginBottom: 12,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  optionSubtitle: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.muted,
  },
  // Full image preview
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closePreviewButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    padding: 8,
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
});
