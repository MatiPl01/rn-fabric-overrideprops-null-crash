// Repro for software-mansion/react-native-reanimated#9785 WITHOUT reanimated.
// react-navigation NATIVE STACK (react-native-screens) with animation enabled, like the issue.
// RN 0.86 (Fabric, New Arch) defaults overrideBySynchronousMountPropsAtMountingAndroid = true.
//
// A screen has a box with a native-driver (useNativeDriver: true) Animated transform.
// That seeds RN's synchronous transform override for the box's view tag.
// Navigating to the next screen (animation: 'slide_from_right') unfocuses the screen, which
// removes the transform prop -> Fabric commits transform:null for the same tag -> RN asserts
// in SurfaceMountingManager.overridePropsReadableMap -> java.lang.AssertionError -> crash.
//
// No react-native-reanimated, no react-native-worklets.
import React, {useEffect, useRef} from 'react';
import {Animated, Pressable, StyleSheet, Text, View} from 'react-native';
import {NavigationContainer, useIsFocused} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

function NativeTransformBox(): React.JSX.Element {
  const translateY = useRef(new Animated.Value(0)).current;
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      translateY.setValue(0);
      // Native driver -> seeds the synchronous transform override for this view tag.
      Animated.spring(translateY, {toValue: 80, useNativeDriver: true}).start();
    }
  }, [isFocused, translateY]);

  // transform present while focused (seeds the override); removed when the screen blurs during
  // navigation -> a later regular Fabric commit sends transform: null for the same tag.
  return (
    <Animated.View
      style={isFocused ? [styles.box, {transform: [{translateY}]}] : styles.box}
    />
  );
}

function HomeScreen({navigation}: any): React.JSX.Element {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>#9785 repro (native-stack, no reanimated)</Text>
      <Text style={styles.desc}>
        The blue box runs a native-driver transform. Tap "Go to Details" to push a
        screen with animation: 'slide_from_right'. Navigating removes the transform
        from the (still-mounted) Home box, sending transform:null and crashing.
      </Text>
      <NativeTransformBox />
      <Pressable style={styles.btn} onPress={() => navigation.navigate('Details')}>
        <Text style={styles.btnText}>Go to Details</Text>
      </Pressable>
    </View>
  );
}

function DetailsScreen({navigation}: any): React.JSX.Element {
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
  screen: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24},
  title: {color: '#191f28', fontSize: 20, fontWeight: '700', textAlign: 'center'},
  desc: {color: '#4e5968', fontSize: 14, textAlign: 'center'},
  box: {width: 96, height: 96, borderRadius: 16, backgroundColor: '#3182f6'},
  btn: {minHeight: 52, width: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#191f28'},
  btnText: {color: '#fff', fontSize: 16, fontWeight: '700'},
});

export default App;
