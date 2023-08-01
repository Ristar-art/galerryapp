import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, FlatList, Text, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

const db = SQLite.openDatabase('gallery.db');

const GalleryComponent = () => {
  const navigation = useNavigation();
  const [showGallery, setShowGallery] = useState(false);
  const [photo, setPhoto] = useState();
  const [photosList, setPhotosList] = useState([]);

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

  const handleImagePress = (item) => {
    setPhoto({ uri: item });
    setShowGallery(true);
  };

  const handleDeletePhoto = (item) => {
    // Delete the photo from the file system
    FileSystem.deleteAsync(item)
      .then(() => {
        console.log('Photo deleted:', item);
        // Remove the photo from the SQLite database
        db.transaction(tx => {
          tx.executeSql(
            'DELETE FROM photos WHERE uri = ?',
            [item],
            (_, result) => console.log('Photo deleted from database'),
            (_, error) => console.error('Error deleting photo from database:', error)
          );
        });
        // Fetch updated list of photos
        db.transaction(tx => {
          tx.executeSql(
            'SELECT * FROM photos',
            [],
            (_, result) => {
              const { rows } = result;
              if (rows && rows.length > 0) {
                const photos = rows._array.map(item => item.uri);
                setPhotosList(photos);
              } else {
                setPhotosList([]);
              }
            },
            (_, error) => console.error('Error fetching photos:', error)
          );
        });
        setPhoto(undefined);
      })
      .catch(error => {
        console.error('Error deleting photo:', error);
      });
  };

  const handleOpenCamera = () => {
    navigation.navigate('Camera');
  };

  const renderGalleryItem = ({ item }) => (
    <View style={styles.galleryItemContainer}>
      <TouchableOpacity onPress={() => handleImagePress(item)}>
        <Image style={styles.galleryImage} source={{ uri: item }} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {photo && (
        <Modal visible={showGallery} transparent={false} onRequestClose={() => setShowGallery(false)}>
          <View style={styles.modalContainer}>
            <Image style={styles.fullScreenImage} source={{ uri: photo.uri }} resizeMode="contain" />
            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.button, styles.discardButton]} onPress={() => setShowGallery(false)}>
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={() => handleDeletePhoto(photo.uri)}>
                <Text style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      <View style={[styles.galleryContainer, { marginTop: 10 }]}>
        <FlatList
          data={photosList}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderGalleryItem}
        />
      </View>

      <TouchableOpacity style={styles.customButton} onPress={handleOpenCamera}>
        <Text style={styles.buttonText}>Open Camera</Text>
      </TouchableOpacity>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryContainer: {
    flex: 1,
    alignSelf: 'stretch',
  },
  galleryItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  galleryImage: {
    width: 100,
    height: 100,
    margin: 5,
    borderRadius: 10, // To make the images circular
    resizeMode: 'cover',
  },
  modalContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'black',
  },
  fullScreenImage: {
    flex: 1,
    alignSelf: 'stretch',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    width: '30%',
  },
  discardButton: {
    backgroundColor: 'lightgray',
  },
  deleteButton: {
    backgroundColor: 'red',
  },
  customButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  imageLocationText: {
    marginLeft: 10,
  },
});

export default GalleryComponent;
