import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// ensures that loading the app in Expo Go or in a native build,
// environment is set up appropriately
registerRootComponent(App);
