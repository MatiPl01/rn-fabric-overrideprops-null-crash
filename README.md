# RN 0.86 Android Fabric crash: `SurfaceMountingManager.overridePropsReadableMap` AssertionError

Minimal reproduction of a **React Native 0.86 Android (Fabric / New Architecture)** crash, using
**React Navigation native-stack** (`react-native-screens`) with a stack animation - close to the
scenario in
[software-mansion/react-native-reanimated#9785](https://github.com/software-mansion/react-native-reanimated/issues/9785).

```
java.lang.AssertionError: Assertion failed
  at com.facebook.react.fabric.mounting.SurfaceMountingManager$Companion.overridePropsReadableMap(SurfaceMountingManager.kt:1331)
  at com.facebook.react.fabric.mounting.SurfaceMountingManager$Companion.access$overridePropsReadableMap(SurfaceMountingManager.kt:1294)
  at com.facebook.react.fabric.mounting.SurfaceMountingManager.updateProps(SurfaceMountingManager.kt:675)
  at com.facebook.react.fabric.mounting.SurfaceMountingManager.updateProps(SurfaceMountingManager.kt:645)
  at com.facebook.react.fabric.mounting.mountitems.IntBufferBatchMountItem.execute(IntBufferBatchMountItem.kt:127)
  at com.facebook.react.fabric.mounting.MountItemDispatcher.executeOrEnqueue(MountItemDispatcher.kt:379)
```

> This project uses **no `react-native-reanimated`** (it is not a dependency - see `package.json`).
> The crash is in React Native core, which is why it surfaced in #9785 but is not caused by Reanimated.

Line `1331` is the `transform` assert; the analogous `opacity` assert is line `1349` (the variant in
#9785). Both are the same code path. **Android only** - the
`overrideBySynchronousMountPropsAtMountingAndroid` mechanism does not exist on iOS.

## Steps to reproduce

1. `npm install`
2. Run a **debug** build on an Android device/emulator (New Architecture is the 0.86 default):
   ```
   npm run android
   ```
3. The Home screen shows a blue box running a native-driver (`useNativeDriver: true`) `Animated`
   transform.
4. Tap **"Go to Details"** - pushes a screen with `animation: 'slide_from_right'`.
5. The app crashes with the `AssertionError` above, during the navigation transition.

See [`App.tsx`](./App.tsx). The Home screen renders the transform only while focused; navigating
away removes it.

## Root cause

RN 0.86 enables the feature flag `overrideBySynchronousMountPropsAtMountingAndroid` by default:

1. Native Animated (`useNativeDriver: true`) synchronously stores a `transform` / `opacity` override
   for the view tag (`tagToSynchronousMountProps`).
2. When that prop is later removed (here, the Home box loses its transform as the screen blurs during
   navigation), a regular Fabric commit delivers `transform: null` for the same tag.
3. `overridePropsReadableMap` re-applies the stored override and asserts the committed value is an
   `Array` / `Number`. The value is `null`, so the assertion fails and the app crashes.

The crash only surfaces on builds with JVM assertions enabled (standard debuggable RN debug builds).
On a release build the assertion is a no-op and the stored override is silently applied.

## Fix

Fixed upstream in [facebook/react-native#56913](https://github.com/facebook/react-native/pull/56913),
which relaxes the assert to also accept `ReadableType.Null`. As of this writing it is only on `main`
- not in `0.86.0` and not on the `0.86-stable` branch, so no 0.86 release contains it yet.

Until it ships, the workaround is to avoid the native-driver `transform` / `opacity` that later gets
cleared. For a React Navigation native-stack, `animation: 'none'` on Android avoids it.

## Environment

- React Native `0.86.0`, New Architecture (Fabric), Hermes
- `@react-navigation/native-stack` + `react-native-screens` (no Reanimated)
- Android (reproduced on an emulator, API 36)
