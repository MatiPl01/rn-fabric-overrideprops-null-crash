// Repro for software-mansion/react-native-reanimated#9785 without reanimated.
// See README.md for the full root-cause writeup.
import React, {useEffect, useRef, useState} from 'react';
import {Animated, Pressable, StyleSheet, Text, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';

type RootStackParamList = {
  Home: undefined;
  Details: undefined;
};

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
type DetailsScreenProps = NativeStackScreenProps<RootStackParamList, 'Details'>;

const Stack = createNativeStackNavigator<RootStackParamList>();

function HomeScreen({navigation}: HomeScreenProps): React.JSX.Element {
  const translateY = useRef(new Animated.Value(0)).current;
  const [showTransform, setShowTransform] = useState(true);

  // A continuous native-driver animation seeds RN's synchronous mount-props override for the box's
  // tag, so the override reliably exists before any tap (a one-shot could lose the timing race).
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: 40,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [translateY]);

  // Drop the transform from the still-mounted box in the same interaction that navigates: the next
  // Fabric commit delivers transform:null for the already-seeded tag, tripping the assert.
  const goToDetails = () => {
    setShowTransform(false);
    navigation.navigate('Details');
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>#9785 repro (native-stack, no reanimated)</Text>
      <Text style={styles.desc}>
        The blue box runs a native-driver transform. Tap "Go to Details": the
        transform is removed from the still-mounted box and a screen with
        animation: 'slide_from_right' is pushed, sending transform:null and
        crashing.
      </Text>
      <Animated.View
        style={
          showTransform ? [styles.box, {transform: [{translateY}]}] : styles.box
        }
      />
      <Pressable style={styles.btn} onPress={goToDetails}>
        <Text style={styles.btnText}>Go to Details</Text>
      </Pressable>
    </View>
  );
}

function DetailsScreen({navigation}: DetailsScreenProps): React.JSX.Element {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Details</Text>
      <Pressable style={styles.btn} onPress={() => navigation.goBack()}>
        <Text style={styles.btnText}>Back</Text>
      </Pressable>
    </View>
  );
}

function App(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{headerShown: false, animation: 'slide_from_right'}}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Details" component={DetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 24,
  },
  title: {
    color: '#191f28',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  desc: {color: '#4e5968', fontSize: 14, textAlign: 'center'},
  box: {width: 96, height: 96, borderRadius: 16, backgroundColor: '#3182f6'},
  btn: {
    minHeight: 52,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#191f28',
  },
  btnText: {color: '#fff', fontSize: 16, fontWeight: '700'},
});

export default App;
