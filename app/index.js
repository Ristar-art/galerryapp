import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, Button, Image, TouchableOpacity, FlatList } from 'react-native';
import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

const db = SQLite.openDatabase('gallery.db');

export default function Page() {
  let cameraRef = useRef();
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [photo, setPhoto] = useState();
  const [location, setLocation] = useState(null);
  const [photosList, setPhotosList] = useState([]);

  useEffect(() => {
    (async () => {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync();
      const locationPermission = await Location.requestForegroundPermissionsAsync();

      setHasCameraPermission(cameraPermission.status === "granted");
      setHasMediaLibraryPermission(mediaLibraryPermission.status === "granted");

      if (locationPermission.status === 'granted') {
        const userLocation = await Location.getCurrentPositionAsync({});
        setLocation(userLocation);
      }
    })();
  }, []);

  useEffect(() => {
    // Fetch all saved photos from the SQLite database
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM photos',
        [],
        (_, result) => {
          const { rows } = result;
          if (rows && rows.length > 0) {
            const photos = rows._array.map(item => item.uri);
            setPhotosList(photos);
          }
        },
        (_, error) => console.error('Error fetching photos:', error)
      );
    });
  }, []);

  const handleTakePic = async () => {
    let options = {
      quality: 1,
      base64: true,
      exif: false
    };

    let newPhoto = await cameraRef.current.takePictureAsync(options);
    setPhoto(newPhoto);

    // Save the picture's link to SQLite database
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO photos (uri) VALUES (?)',
        [newPhoto.uri],
        (_, result) => console.log('Photo saved to database'),
        (_, error) => console.error('Error saving photo:', error)
      );
    });

    setShowGallery(true);
  };

  const handleSavePhoto = () => {
    MediaLibrary.saveToLibraryAsync(photo.uri).then(() => {
      setPhoto(undefined);
      setShowGallery(false);
    });
  };

  const handleDiscardPhoto = () => {
    setPhoto(undefined);
    setShowGallery(false);
  };

  const handleShowCamera = () => {
    setShowCamera(true);
    setShowGallery(false);
  };

  const handleOpenGallery = () => {
    setShowGallery(true);
    setShowCamera(false);
  };

  if (hasCameraPermission === null || hasMediaLibraryPermission === null || location === null) {
    return <Text>Requesting permissions...</Text>;
  } else if (!hasCameraPermission) {
    return <Text>Permission for camera not granted. Please change this in settings.</Text>;
  }

  if (showGallery) {
    return (
      <View style={styles.container}>
        <FlatList
          data={photosList}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => <Image style={styles.galleryImage} source={{ uri: item }} />}
        />
      </View>
    );
  }

  if (photo) {
    return (
      <SafeAreaView style={styles.container}>
        <Image style={styles.preview} source={{ uri: photo.uri }} />
        {hasMediaLibraryPermission ? <Button title="Save" onPress={handleSavePhoto} /> : undefined}
        <Button title="Discard" onPress={handleDiscardPhoto} />
      </SafeAreaView>
    );
  }

  if (showCamera) {
    return (
      <Camera style={styles.container} ref={cameraRef}>
        <View style={styles.buttonContainer}>
          <Button title="Take Pic" onPress={handleTakePic} />
        </View>
        <TouchableOpacity style={styles.galleryButton} onPress={handleOpenGallery}>
          <Text>Gallery</Text>
        </TouchableOpacity>
      </Camera>
    );
  }

  return (
    <View style={styles.container}>
      <Button title="Open Camera" onPress={handleShowCamera} />
      <TouchableOpacity style={styles.galleryButton} onPress={handleOpenGallery}>
        <Text>Gallery</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    backgroundColor: '#fff',
    alignSelf: 'flex-end'
  },
  galleryButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
  },
  preview: {
    alignSelf: 'stretch',
    flex: 1
  },
  galleryImage: {
    width: 150,
    height: 150,
    margin: 5,
    resizeMode: 'cover',
  },
});
