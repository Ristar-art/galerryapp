import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import GalleryComponent from '../screen/galleryComponent';
import CameraComponent from '../screen/cameraComponent';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
  
      <Stack.Navigator>
        <Stack.Screen name="Gllery" component={GalleryComponent} options={{ headerShown: false }}/>
        <Stack.Screen name="Camera" component={CameraComponent} options={{ headerShown: false }}/> 
      </Stack.Navigator>

  );
};

export default AppNavigator;


