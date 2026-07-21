import React, { useState, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@clerk/clerk-expo';
import { 
  ArrowLeft, 
  Trash2, 
  Pencil, 
  Plus, 
  Save, 
  X, 
  Play, 
  CloudUpload,
  Tv,
  Crown,
  ChefHat,
  Coffee,
  Utensils,
  Apple,
  Moon,
  LayoutGrid
} from 'lucide-react-native';

import { colors } from '../theme/colors';
import { 
  saveVideo, 
  deleteVideo, 
  uploadVideoFile, 
  uploadVideoThumbnail,
  extractYouTubeId 
} from '../services/videoService';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { saveRecipe, deleteRecipe, uploadRecipeImage, getRecipeImageSource } from '../services/recipeService';
import { saveKeyFood, deleteKeyFood } from '../services/keyFoodsService';

const { width } = Dimensions.get('window');

const PHASES = ['menstrual', 'follicular', 'ovulation', 'luteal'];

const generateWebThumbnail = (fileUri) => {
  return new Promise((resolve) => {
    if (Platform.OS !== 'web') return resolve(null);
    try {
      const video = document.createElement('video');
      video.src = fileUri;
      video.muted = true;
      video.playsInline = true;
      video.currentTime = 1.5; // Capture at 1.5s
      video.onloadeddata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      video.onerror = (e) => {
        console.warn('[Web Thumbnail] Error:', e);
        resolve(null);
      };
    } catch (err) {
      console.warn('[Web Thumbnail] Catch:', err);
      resolve(null);
    }
  });
};

export const AdminScreen = ({
  onBack,
  videos = [],
  recipes = [],
  keyFoods = {},
  onRefresh,
  isAdmin,
  user,
  isPremium,
  onTogglePremium,
  showToast,
  getToken: getTokenProp,
}) => {
  const { t } = useTranslation();
  const { getToken: getTokenAuth } = useAuth();
  const getToken = getTokenProp || getTokenAuth;
  const scrollViewRef = useRef(null);

  const [activeTab, setActiveTab] = useState('videos');
  const [isSaving, setIsSaving] = useState(false);

  // Video State
  const [editingVideoId, setEditingVideoId] = useState(null);
  const [localVideoFile, setLocalVideoFile] = useState(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    phaseKey: 'follicular',
    mealType: 'none',
    youtubeUrl: '',
    videoUrl: '',
    duration: '5:00',
    calories: '',
    thumbnail: '',
    ingredients: '',
    instructions: '',
  });

  // Recipe State
  const [editingRecipeId, setEditingRecipeId] = useState(null);
  const [localRecipeImage, setLocalRecipeImage] = useState(null);
  const [newRecipe, setNewRecipe] = useState({
    title: '',
    category: 'Breakfast',
    phaseKey: 'follicular',
    mealType: 'lunch',
    calories: '350',
    time: '20',
    nutritionalInsight: '',
    image_url: '',
    imageUrl: '',
    ingredients: '',
    instructions: '',
  });

  const resetVideoForm = () => {
    setNewVideo({
      title: '',
      description: '',
      phaseKey: 'follicular',
      mealType: 'none',
      youtubeUrl: '',
      videoUrl: '',
      duration: '5:00',
      calories: '',
      thumbnail: '',
      ingredients: '',
      instructions: '',
    });
    setLocalVideoFile(null);
    setEditingVideoId(null);
  };

  // Food State
  const [editingFoodId, setEditingFoodId] = useState(null);
  const [newFood, setNewFood] = useState({
    name: '',
    phaseKey: 'follicular',
    categoryKey: 'proteins',
    hormoneTag: 'energy',
    mealType: 'lunch',
    imageUrl: '',
  });

  const resetFoodForm = () => {
    setEditingFoodId(null);
    setNewFood({ name: '', phaseKey: 'follicular', categoryKey: 'proteins', hormoneTag: 'energy', mealType: 'lunch', imageUrl: '' });
  };

  const handleEditFood = (food) => {
    setEditingFoodId(food.id || food.key);
    setNewFood({
      name:        food.name || food.key || '',
      phaseKey:    food.phaseKey    || 'follicular',
      categoryKey: food.categoryKey || 'proteins',
      hormoneTag:  food.hormoneTag  || 'energy',
      mealType:    food.mealType    || 'lunch',
      imageUrl:    food.imageUrl || food.image || '',
    });
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleSaveFood = async () => {
    if (!newFood.name?.trim()) {
      if (showToast) showToast('El nombre del alimento es obligatorio', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const result = await saveKeyFood(getToken, { ...newFood, id: editingFoodId });
      if (result) {
        if (showToast) showToast(editingFoodId ? 'Alimento actualizado' : 'Alimento guardado');
        resetFoodForm();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      if (showToast) showToast('Error al guardar', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFood = (foodId) => {
    const performDelete = async () => {
      try {
        setIsSaving(true);
        const ok = await deleteKeyFood(getToken, foodId);
        if (ok) {
          if (showToast) showToast('Alimento eliminado');
          if (onRefresh) onRefresh();
        }
      } catch (err) {
        if (showToast) showToast('Error al eliminar', 'error');
      } finally {
        setIsSaving(false);
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm('¿Eliminar este alimento?')) performDelete();
    } else {
      Alert.alert('Eliminar', '¿Eliminar este alimento?', [{ text: 'Cancelar' }, { text: 'Eliminar', onPress: performDelete }]);
    }
  };

  const resetRecipeForm = () => {
    setLocalRecipeImage(null);
    setEditingRecipeId(null);
    setNewRecipe({
      title: '',
      category: 'Breakfast',
      phaseKey: 'follicular',
      mealType: 'lunch',
      calories: '350',
      time: '20',
      nutritionalInsight: '',
      image_url: '',
      imageUrl: '',
      ingredients: '',
      instructions: '',
    });
  };

  // Video Handlers
  const handlePickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 1,
    });
    
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const MAX_SIZE_MB = 2048; // Allow large uploads with resumable transfer
      const sizeInMB = asset.fileSize ? asset.fileSize / (1024 * 1024) : 0;
      if (sizeInMB > MAX_SIZE_MB) {
        const tooLargeMessage = t('admin.video_too_large', { size: sizeInMB.toFixed(1), limit: MAX_SIZE_MB });
        if (showToast) {
          showToast(tooLargeMessage, 'error');
        } else {
          Alert.alert(t('admin.video_too_large_title'), t('admin.video_too_large_msg', { limit: MAX_SIZE_MB }));
        }
        return;
      }

      setLocalVideoFile(asset);
      
      // Generate thumbnail automatically from video
      try {
        if (Platform.OS === 'web') {
          const thumbData = await generateWebThumbnail(asset.uri);
          if (thumbData) {
            setNewVideo(prev => ({ ...prev, youtubeUrl: '', videoUrl: '', thumbnail: thumbData }));
          }
        } else {
          const { uri } = await VideoThumbnails.getThumbnailAsync(asset.uri, {
            time: 3000, // Try 3 seconds for better frame
            quality: 0.8,
          });
          setNewVideo(prev => ({ ...prev, youtubeUrl: '', videoUrl: '', thumbnail: uri }));
        }
      } catch (e) {
        console.warn('[Admin] Thumbnail generation error:', e);
        setNewVideo(prev => ({ ...prev, youtubeUrl: '', videoUrl: '' }));
      }
    }
  };

  const handlePickCustomThumbnail = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      setNewVideo(prev => ({ ...prev, thumbnail: result.assets[0].uri }));
    }
  };

  const handleEditVideo = (vid) => {
    setEditingVideoId(vid.id);
    setNewVideo({
      id: vid.id,
      title: vid.title,
      description: vid.description,
      phaseKey: vid.phase_key || vid.phaseKey || 'follicular',
      mealType: vid.meal_type || vid.mealType || 'none',
      youtubeUrl: vid.youtubeUrl || vid.youtube_url || '',
      videoUrl: vid.videoUrl || vid.video_url || '',
      duration: vid.duration,
      calories: vid.calories ? String(vid.calories) : '',
      thumbnail: vid.thumbnail || '',
      ingredients: Array.isArray(vid.ingredients) ? vid.ingredients.join('\n') : '',
      instructions: Array.isArray(vid.instructions) ? vid.instructions.join('\n') : '',
    });
    setLocalVideoFile(null);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    if (showToast) showToast(t('admin.editing_video', { title: vid.title }));
  };

  const handleSaveVideo = async () => {
    if (!newVideo.title?.trim() || (!newVideo.youtubeUrl && !localVideoFile && !newVideo.videoUrl)) {
      if (showToast) showToast(t('admin.video_required'), 'error');
      return;
    }

    setIsSaving(true);
    setVideoUploadProgress(0);
    try {
      let finalVideoUrl = newVideo.videoUrl || '';
      let finalThumbnail = newVideo.thumbnail || '';
      let isYoutube = false;

      if (localVideoFile) {
        const uploaded = await uploadVideoFile(
          getToken,
          localVideoFile,
          localVideoFile.fileName || `video_${Date.now()}.mp4`,
          {
            onProgress: (_, __, percentage) => {
              setVideoUploadProgress(percentage || 0);
            },
          }
        );
        if (!uploaded) {
          throw new Error(t('admin.video_upload_failed'));
        }
        finalVideoUrl = uploaded;

        // Upload generated thumbnail if present (local file or base64)
        const isLocalFile = newVideo.thumbnail && newVideo.thumbnail.startsWith('file');
        const isBase64 = newVideo.thumbnail && newVideo.thumbnail.startsWith('data:');

        if (isLocalFile || isBase64) {
          const thumbUrl = await uploadVideoThumbnail(
            getToken, 
            newVideo.thumbnail, 
            `thumb_${Date.now()}.jpg`
          );
          if (thumbUrl) {
            finalThumbnail = thumbUrl;
          }
        }
      } else if (newVideo.youtubeUrl) {
        const ytId = extractYouTubeId(newVideo.youtubeUrl);
        finalThumbnail = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        isYoutube = true;
        finalVideoUrl = ''; // Clear direct video if youtube
      }
      
      const payload = {
        id: editingVideoId,
        title: newVideo.title,
        description: newVideo.description,
        youtube_url: newVideo.youtubeUrl,
        video_url: finalVideoUrl,
        phase_key: newVideo.phaseKey,
        meal_type: newVideo.mealType,
        duration: newVideo.duration,
        calories: parseInt(newVideo.calories) || 0,
        thumbnail: finalThumbnail,
        is_youtube: isYoutube,
        updated_at: new Date().toISOString(),
        ingredients: newVideo.ingredients ? newVideo.ingredients.split('\n').filter(Boolean) : [],
        instructions: newVideo.instructions ? newVideo.instructions.split('\n').filter(Boolean) : [],
      };

      const success = await saveVideo(getToken, payload);
      if (success) {
        if (showToast) showToast(editingVideoId ? t('admin.video_updated') : t('admin.video_saved'));
        resetVideoForm();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('[Admin Save Video Error]:', err);
      Alert.alert(t('admin.save_error'), err.message);
    } finally {
      setIsSaving(false);
      setVideoUploadProgress(0);
    }
  };

  const handleDeleteVideo = (videoId) => {
    const performDelete = async () => {
      try {
        setIsSaving(true);
        const success = await deleteVideo(getToken, videoId);
        if (success) {
          if (showToast) showToast(t('admin.video_deleted'));
          if (onRefresh) onRefresh();
        }
      } catch (err) {
        if (showToast) showToast(t('admin.delete_error'), 'error');
      } finally {
        setIsSaving(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('admin.confirm_delete_video'))) performDelete();
    } else {
      Alert.alert(t('common.delete'), t('admin.confirm_delete_video'), [{ text: t('common.cancel') }, { text: t('common.delete'), onPress: performDelete }]);
    }
  };


  // Recipe Handlers
  const handleEditRecipe = (rec) => {
    setEditingRecipeId(rec.id);
    setLocalRecipeImage(null); // Critical fix: Clear local image when starting to edit
    setNewRecipe({
      id: rec.id,
      title: rec.title,
      category: rec.category,
      phaseKey: rec.phase_key || rec.phaseKey || 'follicular',
      mealType: rec.mealType || rec.meal_type || 'lunch',
      calories: String(rec.calories || 0),
      time: String(rec.time || 20),
      nutritionalInsight: rec.nutritional_insight || rec.nutritionalInsight || '',
      image_url: rec.image_url || rec.imageUrl || rec.image?.uri || rec.image?.url || '',
      imageUrl: rec.image_url || rec.imageUrl || rec.image?.uri || rec.image?.url || '',
      ingredients: Array.isArray(rec.ingredients) ? rec.ingredients.join('\n') : '',
      instructions: Array.isArray(rec.instructions) ? rec.instructions.join('\n') : '',
    });
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    if (showToast) showToast(t('admin.editing_recipe', { title: rec.title }));
  };

  const handlePickRecipeImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled) {
      setLocalRecipeImage(result.assets[0]);
    }
  };

  const handleSaveRecipe = async () => {
    if (!newRecipe.title?.trim()) {
      if (showToast) showToast(t('admin.recipe_required'), 'error');
      return;
    }
    const parsedCalories = parseInt(newRecipe.calories, 10);
    const parsedTime = parseInt(newRecipe.time, 10);
    if (isNaN(parsedCalories) || parsedCalories < 0) {
      if (showToast) showToast(t('admin.calories_invalid', { defaultValue: 'Enter a valid calorie amount.' }), 'error');
      return;
    }
    if (isNaN(parsedTime) || parsedTime < 1) {
      if (showToast) showToast(t('admin.time_invalid', { defaultValue: 'Enter a valid preparation time.' }), 'error');
      return;
    }

    setIsSaving(true);
    try {
      let finalImageUrl = newRecipe.image_url || newRecipe.imageUrl || '';
      
      if (localRecipeImage) {
        const uploaded = await uploadRecipeImage(getToken, localRecipeImage, `recipe_${Date.now()}.jpg`);
        if (uploaded) {
          finalImageUrl = uploaded;
        } else {
          throw new Error(t('admin.recipe_image_upload_failed'));
        }
      }

      const payload = {
        title: newRecipe.title,
        category: newRecipe.category,
        phase_key: newRecipe.phaseKey,
        meal_type: newRecipe.mealType,
        calories: parseInt(newRecipe.calories) || 0,
        time: parseInt(newRecipe.time) || 20,
        nutritionalInsight: newRecipe.nutritionalInsight || '',
        image_url: finalImageUrl,
        imageUrl: finalImageUrl,
        ingredients: newRecipe.ingredients.split('\n').filter(Boolean),
        instructions: newRecipe.instructions.split('\n').filter(Boolean),
      };

      if (editingRecipeId) {
        payload.id = editingRecipeId;
      }

      const success = await saveRecipe(getToken, payload);
      if (success) {
        if (showToast) showToast(editingRecipeId ? t('admin.recipe_updated') : t('admin.recipe_saved'));
        resetRecipeForm();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('[Admin Save Recipe Error]:', err);
      Alert.alert(t('admin.save_error'), err.message || t('admin.database_error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecipe = (id) => {
    const performDelete = async () => {
        try {
          setIsSaving(true);
          const ok = await deleteRecipe(getToken, id);
          if (ok) {
            if (showToast) showToast(t('admin.recipe_deleted'));
            if (onRefresh) onRefresh();
          }
        } catch (err) {
          if (showToast) showToast(t('admin.delete_error'), 'error');
        } finally {
          setIsSaving(false);
        }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('admin.confirm_delete_recipe'))) performDelete();
    } else {
      Alert.alert(t('common.delete'), t('admin.confirm_delete_recipe'), [{ text: t('common.cancel') }, { text: t('common.delete'), onPress: performDelete }]);
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <Text style={{ fontFamily: 'Outfit_500Medium', color: colors.on_surface }}>{t('admin.access_denied') || 'Access Denied'}</Text>
        <Pressable onPress={onBack}><Text style={{ color: colors.primary, fontFamily: 'Outfit_700Bold' }}>{t('common.go_back') || 'Go Back'}</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.on_surface} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('settings.admin')}</Text>
        <Pressable 
          onPress={onTogglePremium} 
          style={[styles.premiumBtn, isPremium && styles.premiumBtnActive]}
        >
          <Crown size={16} color={isPremium ? '#FFF' : colors.primary} />
          <Text style={[styles.premiumBtnText, isPremium && styles.premiumBtnTextActive]}>
            {isPremium ? t('admin.pro_active') : t('admin.upgrade')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        <Pressable 
          onPress={() => setActiveTab('videos')} 
          style={[styles.tab, activeTab === 'videos' && styles.tabActive]}
        >
          <Play size={18} color={activeTab === 'videos' ? colors.primary : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'videos' && styles.tabTextActive]}>{t('nav.videos')}</Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('recipes')}
          style={[styles.tab, activeTab === 'recipes' && styles.tabActive]}
        >
          <ChefHat size={18} color={activeTab === 'recipes' ? colors.primary : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'recipes' && styles.tabTextActive]}>{t('nav.recipes')}</Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('foods')}
          style={[styles.tab, activeTab === 'foods' && styles.tabActive]}
        >
          <Apple size={18} color={activeTab === 'foods' ? colors.primary : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'foods' && styles.tabTextActive]}>Alimentos</Text>
        </Pressable>
      </View>

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'videos' && (
          <View>
            <View style={styles.formCard}>
                <Text style={styles.formTitle}>{editingVideoId ? t('admin.edit_video') : t('admin.add_video')}</Text>
                
                <Text style={styles.label}>{t('videos.video_title')}</Text>
                <TextInput 
                  style={styles.input} 
                  value={newVideo.title} 
                  onChangeText={t => setNewVideo({...newVideo, title: t})}
                />

                <Text style={styles.label}>{t('admin.video_source')}</Text>
                <Pressable onPress={handlePickVideo} style={styles.uploadBox}>
                    <CloudUpload size={24} color={localVideoFile ? colors.primary : '#64748B'} />
                    <Text style={[styles.uploadText, localVideoFile && { color: colors.primary }]}>
                        {localVideoFile ? t('admin.file_ready') : t('admin.upload_file')}
                    </Text>
                    {localVideoFile && <Text style={styles.uploadSubtext}>{t('admin.ready_to_upload')}</Text>}
                </Pressable>
                
                <Text style={styles.warningHint}>
                  {t('admin.video_upload_hint')}
                </Text>

                {newVideo.thumbnail ? (
                  <View style={styles.thumbnailPreviewContainer}>
                    <Text style={styles.label}>{t('admin.thumbnail_preview')}</Text>
                    <Image source={{ uri: newVideo.thumbnail }} style={styles.thumbnailPreview} />
                    <Pressable onPress={handlePickCustomThumbnail} style={styles.changeThumbBtn}>
                      <Text style={styles.changeThumbText}>{t('admin.change_thumbnail')}</Text>
                    </Pressable>
                  </View>
                ) : null}

                <Text style={styles.label}>{t('videos.enter_youtube_url')}</Text>
                <View style={styles.inputWrapper}>
                    <Tv size={18} color={colors.primary} style={{ marginRight: 8 }} />
                    <TextInput 
                      style={[styles.input, { flex: 1, borderBottomWidth: 0, marginBottom: 0 }]} 
                      value={newVideo.youtubeUrl} 
                      placeholder={t('admin.youtube_placeholder')}
                      onChangeText={t => setNewVideo({...newVideo, youtubeUrl: t, videoUrl: ''})}
                    />
                </View>

                <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.label}>{t('videos.phase')}</Text>
                        <View style={styles.phaseSelector}>
                            {['menstrual', 'follicular', 'ovulation', 'luteal'].map(p => (
                                <Pressable 
                                    key={p} 
                                    onPress={() => setNewVideo({...newVideo, phaseKey: p})}
                                    style={[styles.phaseBtn, newVideo.phaseKey === p && { backgroundColor: colors.primary }]}
                                >
                                    <Text style={[styles.phaseBtnText, newVideo.phaseKey === p && { color: '#FFF' }]}>
                                        {p.charAt(0).toUpperCase()}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>{t('videos.duration')}</Text>
                        <TextInput
                           style={styles.input}
                           value={newVideo.duration}
                           placeholder="5:00"
                           onChangeText={t => setNewVideo({...newVideo, duration: t})}
                        />
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>{t('admin.calories', { defaultValue: 'Calorías (kcal)' })}</Text>
                        <TextInput
                           style={styles.input}
                           value={newVideo.calories}
                           placeholder="320"
                           keyboardType="numeric"
                           onChangeText={v => setNewVideo({...newVideo, calories: v.replace(/[^0-9]/g, '')})}
                        />
                    </View>
                </View>

                <Text style={styles.label}>{t('videos.category')}</Text>
                <View style={styles.mealTypeSelector}>
                    {[
                      { id: 'none', icon: LayoutGrid, label: t('admin.my_phase') },
                      { id: 'breakfast', icon: Coffee, label: t('dailylog.meal_types.breakfast') },
                      { id: 'lunch', icon: Utensils, label: t('dailylog.meal_types.lunch') },
                      { id: 'snack', icon: Apple, label: t('dailylog.meal_types.snack') },
                      { id: 'dinner', icon: Moon, label: t('dailylog.meal_types.dinner') },
                      { id: 'prep', icon: ChefHat, label: t('dailylog.meal_types.prep') }
                    ].map(m => (
                        <Pressable
                            key={m.id}
                            onPress={() => setNewVideo({...newVideo, mealType: m.id})}
                            style={[styles.mealBtn, newVideo.mealType === m.id && styles.mealBtnActive]}
                        >
                            <m.icon size={14} color={newVideo.mealType === m.id ? '#FFF' : colors.on_surface_variant} style={{ marginRight: 6 }} />
                            <Text style={[styles.mealBtnText, newVideo.mealType === m.id && styles.mealBtnTextActive]}>
                                {m.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                <Text style={styles.label}>{t('admin.ingredients')}</Text>
                <TextInput
                  multiline
                  numberOfLines={4}
                  style={[styles.input, { height: 90, textAlignVertical: 'top', paddingTop: 12 }]}
                  value={newVideo.ingredients}
                  onChangeText={v => setNewVideo({...newVideo, ingredients: v})}
                />

                <Text style={styles.label}>{t('admin.instructions')}</Text>
                <TextInput
                  multiline
                  numberOfLines={4}
                  style={[styles.input, { height: 90, textAlignVertical: 'top', paddingTop: 12 }]}
                  value={newVideo.instructions}
                  onChangeText={v => setNewVideo({...newVideo, instructions: v})}
                />

                <Pressable style={styles.saveBtn} onPress={handleSaveVideo} disabled={isSaving}>
                    {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{editingVideoId ? t('admin.update_video') : t('admin.save_video')}</Text>}
                </Pressable>
                {isSaving && videoUploadProgress > 0 ? (
                  <Text style={styles.uploadProgressText}>{t('admin.upload_progress', { pct: Math.round(videoUploadProgress) })}</Text>
                ) : null}
                {editingVideoId && (
                    <Pressable style={[styles.saveBtn, { backgroundColor: '#F1F5F9', marginTop: 8 }]} onPress={resetVideoForm}>
                        <Text style={{ color: '#475569' }}>{t('common.cancel')}</Text>
                    </Pressable>
                )}
            </View>

            <Text style={styles.sectionTitle}>{t('admin.existing_videos')} ({videos.length})</Text>
            {videos.map(v => (
                <View key={v.id} style={styles.itemCard}>
                    <Image source={{ uri: v.thumbnail || (v.youtube_url ? `https://img.youtube.com/vi/${extractYouTubeId(v.youtube_url)}/0.jpg` : 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800') }} style={styles.itemThumb} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>{v.title}</Text>
                        <Text style={styles.itemSub}>
                          {(v.meal_type || v.mealType) && (v.meal_type !== 'none' && v.mealType !== 'none') ? `${t(`dailylog.meal_types.${v.meal_type || v.mealType}`)} • ` : ''}
                          {t(`phases.${v.phase_key || v.phaseKey || 'all'}`)}
                        </Text>
                    </View>
                    <View style={styles.itemActions}>
                        <Pressable onPress={() => handleEditVideo(v)} style={styles.itemActionBtn}><Pencil size={18} color={colors.primary}/></Pressable>
                        <Pressable onPress={() => handleDeleteVideo(v.id)} style={styles.itemActionBtn}><Trash2 size={18} color="#EB5757"/></Pressable>
                    </View>
                </View>
            ))}
          </View>
        )}

        {activeTab === 'recipes' && (
          <View>
            <View style={styles.formCard}>
                <Text style={styles.formTitle}>{editingRecipeId ? t('admin.edit_recipe') : t('admin.add_recipe')}</Text>
                
                <Text style={styles.label}>{t('admin.recipe_title')}</Text>
                <TextInput style={styles.input} value={newRecipe.title} onChangeText={t => setNewRecipe({...newRecipe, title: t})} />

                <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.label}>{t('admin.phase')}</Text>
                        <View style={styles.phaseSelector}>
                            {['menstrual', 'follicular', 'ovulation', 'luteal'].map(p => (
                                <Pressable 
                                    key={p} 
                                    onPress={() => setNewRecipe({...newRecipe, phaseKey: p})}
                                    style={[styles.phaseBtn, newRecipe.phaseKey === p && { backgroundColor: colors.primary }]}
                                >
                                    <Text style={[styles.phaseBtnText, newRecipe.phaseKey === p && { color: '#FFF' }]}>
                                        {p.charAt(0).toUpperCase()}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>{t('admin.calories_time')}</Text>
                        <TextInput style={styles.input} value={newRecipe.calories} onChangeText={t => setNewRecipe({...newRecipe, calories: t})} />
                    </View>
                </View>

                <Text style={styles.label}>{t('admin.meal_type')}</Text>
                <View style={styles.mealTypeSelector}>
                    {[
                      { id: 'breakfast', icon: Coffee, label: t('dailylog.meal_types.breakfast') },
                      { id: 'lunch', icon: Utensils, label: t('dailylog.meal_types.lunch') },
                      { id: 'snack', icon: Apple, label: t('dailylog.meal_types.snack') },
                      { id: 'dinner', icon: Moon, label: t('dailylog.meal_types.dinner') },
                      { id: 'prep', icon: ChefHat, label: t('dailylog.meal_types.prep') }
                    ].map(m => (
                        <Pressable
                            key={m.id}
                            onPress={() => setNewRecipe({...newRecipe, mealType: m.id})}
                            style={[styles.mealBtn, newRecipe.mealType === m.id && styles.mealBtnActive]}
                        >
                            <m.icon size={14} color={newRecipe.mealType === m.id ? '#FFF' : colors.on_surface_variant} style={{ marginRight: 6 }} />
                            <Text style={[styles.mealBtnText, newRecipe.mealType === m.id && styles.mealBtnTextActive]}>
                                {m.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                <Pressable onPress={handlePickRecipeImage} style={styles.imagePicker}>
                  {localRecipeImage || newRecipe.image_url ? (
                        <Image source={{ uri: localRecipeImage?.uri || newRecipe.image_url || newRecipe.imageUrl }} style={styles.pickedImage} />
                  ) : (
                        <Text style={{ color: colors.primary }}>{t('admin.select_recipe_image')}</Text>
                  )}
                </Pressable>

                <Text style={styles.label}>{t('admin.ingredients')}</Text>
                <TextInput multiline numberOfLines={4} style={[styles.input, { height: 80 }]} value={newRecipe.ingredients} onChangeText={t => setNewRecipe({...newRecipe, ingredients: t})} />

                <Text style={styles.label}>{t('admin.instructions')}</Text>
                <TextInput multiline numberOfLines={4} style={[styles.input, { height: 80 }]} value={newRecipe.instructions} onChangeText={t => setNewRecipe({...newRecipe, instructions: t})} />

                <Pressable style={styles.saveBtn} onPress={handleSaveRecipe} disabled={isSaving}>
                    {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{t('admin.save_recipe')}</Text>}
                </Pressable>
                {editingRecipeId && (
                    <Pressable style={[styles.saveBtn, { backgroundColor: '#F1F5F9', marginTop: 8 }]} onPress={resetRecipeForm}>
                        <Text style={{ color: '#475569' }}>{t('admin.cancel_edit')}</Text>
                    </Pressable>
                )}
            </View>

            <Text style={styles.sectionTitle}>{t('admin.existing_recipes')} ({recipes.length})</Text>
            {recipes.map(r => (
                <View key={r.id} style={styles.itemCard}>
                    <Image source={getRecipeImageSource(r)} style={styles.itemThumb} />
                    <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle}>{r.title}</Text>
                        <Text style={styles.itemSub}>
                          {r.mealType && r.mealType !== 'none' ? t(`dailylog.meal_types.${r.mealType}`) : t('admin.my_phase')}
                          {' • '}
                          {t(`phases.${r.phase_key || r.phaseKey || 'all'}`)}
                        </Text>
                    </View>
                    <View style={styles.itemActions}>
                        <Pressable onPress={() => handleEditRecipe(r)} style={styles.itemActionBtn}><Pencil size={18} color={colors.primary}/></Pressable>
                        <Pressable onPress={() => handleDeleteRecipe(r.id)} style={styles.itemActionBtn}><Trash2 size={18} color="#EB5757"/></Pressable>
                    </View>
                </View>
            ))}
          </View>
        )}

        {activeTab === 'foods' && (

          <View>
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Agregar alimento</Text>

              <Text style={styles.label}>Nombre del alimento *</Text>
              <TextInput
                style={styles.input}
                value={newFood.name}
                placeholder="Ej: Espinacas, Salmón, Lentejas..."
                onChangeText={v => setNewFood({ ...newFood, name: v })}
              />

              <Text style={styles.label}>Fase</Text>
              <View style={styles.phaseSelector}>
                {['menstrual', 'follicular', 'ovulation', 'luteal'].map(p => (
                  <Pressable
                    key={p}
                    onPress={() => setNewFood({ ...newFood, phaseKey: p })}
                    style={[styles.phaseBtn, newFood.phaseKey === p && { backgroundColor: colors.primary }]}
                  >
                    <Text style={[styles.phaseBtnText, newFood.phaseKey === p && { color: '#FFF' }]}>
                      {p.charAt(0).toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Categoría</Text>
              <View style={styles.mealTypeSelector}>
                {[
                  { id: 'proteins',   label: 'Proteínas' },
                  { id: 'fats',       label: 'Grasas' },
                  { id: 'carbs',      label: 'Carbos' },
                  { id: 'veg_fruits', label: 'Veg/Fruta' },
                ].map(c => (
                  <Pressable
                    key={c.id}
                    onPress={() => setNewFood({ ...newFood, categoryKey: c.id })}
                    style={[styles.mealBtn, newFood.categoryKey === c.id && styles.mealBtnActive]}
                  >
                    <Text style={[styles.mealBtnText, newFood.categoryKey === c.id && styles.mealBtnTextActive]}>
                      {c.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Beneficio hormonal</Text>
              <View style={styles.mealTypeSelector}>
                {[
                  { id: 'estrogen',         label: 'Estrógeno' },
                  { id: 'progesterone',     label: 'Progesterona' },
                  { id: 'antiinflammatory', label: 'Antiinflamatorio' },
                  { id: 'energy',           label: 'Energía' },
                ].map(h => (
                  <Pressable
                    key={h.id}
                    onPress={() => setNewFood({ ...newFood, hormoneTag: h.id })}
                    style={[styles.mealBtn, newFood.hormoneTag === h.id && styles.mealBtnActive]}
                  >
                    <Text style={[styles.mealBtnText, newFood.hormoneTag === h.id && styles.mealBtnTextActive]}>
                      {h.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Tipo de comida</Text>
              <View style={styles.mealTypeSelector}>
                {[
                  { id: 'breakfast', label: 'Desayuno' },
                  { id: 'lunch',     label: 'Almuerzo' },
                  { id: 'snack',     label: 'Snack' },
                  { id: 'dinner',    label: 'Cena' },
                ].map(m => (
                  <Pressable
                    key={m.id}
                    onPress={() => setNewFood({ ...newFood, mealType: m.id })}
                    style={[styles.mealBtn, newFood.mealType === m.id && styles.mealBtnActive]}
                  >
                    <Text style={[styles.mealBtnText, newFood.mealType === m.id && styles.mealBtnTextActive]}>
                      {m.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>URL de imagen (opcional)</Text>
              <TextInput
                style={styles.input}
                value={newFood.imageUrl}
                placeholder="https://..."
                autoCapitalize="none"
                onChangeText={v => setNewFood({ ...newFood, imageUrl: v })}
              />

              <Pressable style={styles.saveBtn} onPress={handleSaveFood} disabled={isSaving}>
                {isSaving
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.saveBtnText}>{editingFoodId ? 'Actualizar alimento' : 'Guardar alimento'}</Text>}
              </Pressable>
              {editingFoodId && (
                <Pressable style={[styles.saveBtn, { backgroundColor: '#F1F5F9', marginTop: 8 }]} onPress={resetFoodForm}>
                  <Text style={{ color: '#475569' }}>Cancelar</Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.sectionTitle}>Alimentos guardados</Text>
            {Object.keys(keyFoods).length === 0 ? (
              <Text style={{ color: '#94A3B8', textAlign: 'center', marginTop: 16 }}>
                Aún no hay alimentos. Agrega el primero arriba.
              </Text>
            ) : (
              ['menstrual', 'follicular', 'ovulation', 'luteal'].map(phase =>
                (keyFoods[phase] || []).map(cat =>
                  cat.items.map(food => (
                    <View key={food.key} style={styles.itemCard}>
                      {food.image ? (
                        <Image source={{ uri: food.image }} style={styles.itemThumb} />
                      ) : (
                        <View style={[styles.itemThumb, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
                          <Apple size={20} color="#CBD5E1" />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>{food.name || food.key}</Text>
                        <Text style={styles.itemSub}>{phase} · {cat.categoryKey}</Text>
                      </View>
                      <View style={styles.itemActions}>
                        <Pressable onPress={() => handleEditFood({ ...food, phaseKey: phase, categoryKey: cat.categoryKey, imageUrl: food.image })} style={styles.itemActionBtn}>
                          <Pencil size={18} color={colors.primary} />
                        </Pressable>
                        <Pressable onPress={() => handleDeleteFood(food.key)} style={styles.itemActionBtn}>
                          <Trash2 size={18} color="#EB5757" />
                        </Pressable>
                      </View>
                    </View>
                  ))
                )
              )
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: { padding: 8, marginRight: 10 },
  headerTitle: { fontSize: 22, fontFamily: 'InstrumentSerif_400Regular', color: '#1A1A1A', flex: 1 },
  premiumBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F1FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  premiumBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  premiumBtnText: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: colors.primary, marginLeft: 6 },
  premiumBtnTextActive: { color: '#FFF' },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 8,
  },
  tabActive: { borderColor: colors.primary, backgroundColor: '#F0F9FF' },
  tabText: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#64748B' },
  tabTextActive: { color: colors.primary },
  scrollContent: { padding: 20 },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 30,
  },
  formTitle: { fontSize: 18, fontFamily: 'InstrumentSerif_400Regular', color: '#1A1A1A', marginBottom: 20 },
  warningHint: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    color: '#D97706',
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    lineHeight: 18,
  },
  label: { fontSize: 13, fontFamily: 'Outfit_700Bold', color: '#64748B', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#F8FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  row: { flexDirection: 'row', marginTop: 10 },
  phaseSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  phaseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phaseBtnActive: { backgroundColor: colors.primary },
  phaseBtnText: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: '#64748B' },
  phaseBtnTextActive: { color: '#FFF' },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontFamily: 'Outfit_700Bold' },
  uploadProgressText: {
    marginTop: 10,
    textAlign: 'center',
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: '#64748B',
  },
  sectionTitle: { fontSize: 16, fontFamily: 'InstrumentSerif_400Regular', color: '#64748B', marginBottom: 16 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  itemThumb: { width: 50, height: 50, borderRadius: 10, marginRight: 12 },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: '#1A1A1A' },
  itemSub: { fontSize: 12, fontFamily: 'Outfit_500Medium', color: '#64748B' },
  itemActions: { flexDirection: 'row', gap: 8 },
  itemActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  imagePicker: {
    width: '100%',
    height: 150,
    backgroundColor: '#F8FAFB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    overflow: 'hidden'
  },
  mealTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  mealBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mealBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mealBtnText: {
    fontSize: 12,
    fontFamily: 'Outfit_700Bold',
    color: '#64748B',
  },
  mealBtnTextActive: {
    color: '#FFF',
  },
  pickedImage: { width: '100%', height: '100%' },
  uploadBox: {
    backgroundColor: '#F8FAFB',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    marginTop: 8,
  },
  uploadText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
  uploadSubtext: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: colors.primary,
    marginTop: 4,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  thumbnailPreviewContainer: {
    marginTop: 20,
    backgroundColor: '#F8FAFB',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  thumbnailPreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: '#000',
  },
  changeThumbBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: colors.primary,
    alignSelf: 'flex-start',
  },
  changeThumbText: {
    color: colors.primary,
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
  },
});
