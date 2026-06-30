// Repro for software-mansion/react-native-reanimated#9785 WITHOUT reanimated.
// RN 0.86 (Fabric, New Arch) defaults overrideBySynchronousMountPropsAtMountingAndroid = true.
// Pattern: native-driver Animated transform seeds the synchronous override, then the
// transform prop is removed -> Fabric commits transform:null -> RN asserts -> crash.
// No react-native-reanimated, no react-navigation here. Plain RN Animated only.
import React, {useRef, useState} from 'react';
import {Animated, Pressable, StyleSheet, Text, View} from 'react-native';

function App(): React.JSX.Element {
  const translateY = useRef(new Animated.Value(0)).current;
  const [clearTransform, setClearTransform] = useState(false);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>#9785 repro (no reanimated)</Text>
      <Text style={styles.desc}>
        1) Start native transform 2) Clear transform. Step 2 removes the
        transform prop after a native-driver transform was applied to the same
        tag.
      </Text>
      <Animated.View
        style={
          clearTransform ? styles.box : [styles.box, {transform: [{translateY}]}]
        }
      />
      <Pressable
        style={styles.btn}
        onPress={() => {
          setClearTransform(false);
          translateY.setValue(0);
          Animated.spring(translateY, {toValue: 120, useNativeDriver: true}).start();
        }}>
        <Text style={styles.btnText}>1. Start native transform</Text>
      </Pressable>
      <Pressable style={styles.btn} onPress={() => setClearTransform(true)}>
        <Text style={styles.btnText}>2. Clear transform</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24},
  title: {color: '#191f28', fontSize: 20, fontWeight: '700'},
  desc: {color: '#4e5968', fontSize: 14, textAlign: 'center'},
  box: {width: 96, height: 96, borderRadius: 16, backgroundColor: '#3182f6'},
  btn: {minHeight: 52, width: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#191f28'},
  btnText: {color: '#fff', fontSize: 16, fontWeight: '700'},
});

export default App;
