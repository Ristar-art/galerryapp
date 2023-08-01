import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, Button, Image, TouchableOpacity, FlatList } from 'react-native';
import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

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
    // Open or create the database and create the "photos" table if it doesn't exist
    db.transaction(tx => {
      tx.executeSql(
        'CREATE TABLE IF NOT EXISTS photos (id INTEGER PRIMARY KEY AUTOINCREMENT, uri TEXT NOT NULL)'
      );
    });

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
    if (!cameraRef.current) return;

    let photoData = await cameraRef.current.takePictureAsync({ base64: true });

    // Save the photo as a file in the device's file system
    const filename = FileSystem.documentDirectory + Date.now() + '.jpg';
    await FileSystem.writeAsStringAsync(filename, photoData.base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Save the file path (URI) to the SQLite database
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO photos (uri) VALUES (?)',
        [filename],
        (_, result) => console.log('Photo saved to database'),
        (_, error) => console.error('Error saving photo:', error)
      );
    });

    setPhoto({ uri: filename });
    setShowGallery(false);
    setShowCamera(false);
  };

  const handleSavePhoto = () => {
    MediaLibrary.saveToLibraryAsync(photo.uri).then(() => {
      setPhoto(undefined);
    });
  };

  const handleDiscardPhoto = () => {
    setPhoto(undefined);
  };

  const handleShowCamera = () => {
    setPhoto(undefined);
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

  return (
    <View style={styles.container}>
      {showCamera && (
        <Camera style={styles.cameraContainer} ref={cameraRef}>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.takePicButton} onPress={handleTakePic}>
              <Text style={styles.buttonText}>Take Pic</Text>
            </TouchableOpacity>
          </View>
        </Camera>
      )}

      {!showCamera && !showGallery && (
        <View style={styles.buttonContainer}>
          <Button title="Open Camera" onPress={handleShowCamera} />
        </View>
      )}

      {photo && !showGallery && (
        <View style={styles.photoContainer}>
          <Image style={styles.preview} source={{ uri: photo.uri }} />
          <View style={styles.buttonContainer}>
            {hasMediaLibraryPermission && (
              <Button title="Save" onPress={handleSavePhoto} />
            )}
            <Button title="Discard" onPress={handleDiscardPhoto} />
          </View>
        </View>
      )}

      {!showCamera && (
        <TouchableOpacity style={styles.galleryButton} onPress={handleOpenGallery}>
          <Text>Gallery</Text>
        </TouchableOpacity>
      )}

      {showGallery && (
        <View style={styles.galleryContainer}>
          <FlatList
            data={photosList}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => setPhoto({ uri: item })}>
                <Image style={styles.galleryImage} source={{ uri: item }} />
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraContainer: {
    flex: 1,
    alignSelf: 'stretch',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  takePicButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  galleryButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
  },
  galleryContainer: {
    flex: 1,
    alignSelf: 'stretch',
  },
  galleryImage: {
    width: 150,
    height: 150,
    margin: 5,
    resizeMode: 'cover',
  },
  photoContainer: {
    flex: 1,
    alignSelf: 'stretch',
  },
  preview: {
    flex: 1,
  },
});
