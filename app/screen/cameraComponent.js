import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';

const db = SQLite.openDatabase('gallery.db');

const CameraComponent = () => {
  const navigation = useNavigation();
  let cameraRef = useRef();
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [location, setLocation] = useState(null);
  const [type, setType] = useState(CameraType.back);

  const createPhotosTable = () => {
    db.transaction((tx) => {
      tx.executeSql(
        'DROP TABLE IF EXISTS photos',
        [],
        () => {
          tx.executeSql(
            'CREATE TABLE IF NOT EXISTS photos (id INTEGER PRIMARY KEY AUTOINCREMENT, uri TEXT NOT NULL, latitude REAL, longitude REAL)',
            [],
            () => {
              console.log('Table "photos" created successfully');
            },
            (_, error) => {
              console.error('Error creating table:', error);
            }
          );
        },
        (_, error) => {
          console.error('Error dropping table:', error);
        }
      );
    });
  };
  
  
  useEffect(() => {
    (async () => {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const locationPermission = await Location.requestForegroundPermissionsAsync();    
      setHasCameraPermission(cameraPermission.status === 'granted');
      if (locationPermission.status === 'granted') {
        const userLocation = await Location.getCurrentPositionAsync({});
        setLocation(userLocation);
      }else {
        return <Text>Permission to access location was denied.</Text>;
      }

      createPhotosTable();
    })();
  }, []);

  function toggleCameraType() {
    setType(current => (current === CameraType.back ? CameraType.front : CameraType.back));
  }

  const handleTakePic = async () => {
    if (!cameraRef.current) return;
  
    let photoData = await cameraRef.current.takePictureAsync({ base64: true });
  
    // Save the photo as a file in the device's file system
    const filename = FileSystem.documentDirectory + Date.now() + '.jpg';
    await FileSystem.writeAsStringAsync(filename, photoData.base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  
    // Get the current location
    const location = await Location.getCurrentPositionAsync({});
  
    // Save the file path (URI) and location to the SQLite database
    db.transaction((tx) => {
      tx.executeSql(
        'INSERT INTO photos (uri, latitude, longitude) VALUES (?, ?, ?)',
        [filename, location.coords.latitude, location.coords.longitude],
        (_, result) => {
          console.log('Photo saved to database with location');
          //fetchPhotosFromDatabase(); // Fetch the updated list of photos after inserting
        },
        (_, error) => console.error('Error saving photo with location:', error)
      );
    });
  };
  


  if (hasCameraPermission === null) {
    return <Text>Requesting permissions...</Text>;
  } else if (!hasCameraPermission) {
    return <Text>Permission for camera not granted. Please change this in settings.</Text>;
  }

  return (
    <View style={styles.container}>
      <Camera style={styles.camera} ref={cameraRef} type={type} />
      <View style={styles.buttonContainer}>
        <View style={styles.buttonWrapper}>        
          <TouchableOpacity style={styles.takePicButton} onPress={toggleCameraType}>
            <Text style={styles.buttonText}>Flip Camera</Text>
          </TouchableOpacity>         
          <TouchableOpacity style={styles.takePicButton} onPress={handleTakePic}>
            <Text style={styles.buttonText}>Take Pic</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
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
  buttonWrapper: {
    flexDirection: 'row', // Arrange buttons horizontally
  },
  takePicButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    marginRight: 10, // Add margin between buttons
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'red',
  },
});

export default CameraComponent;
