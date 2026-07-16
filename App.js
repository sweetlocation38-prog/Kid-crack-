import React from 'react';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/main';

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <RootNavigator />
    </>
  );
}
