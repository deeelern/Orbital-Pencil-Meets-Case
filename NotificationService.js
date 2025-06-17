import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      alert("Failed to get push token for push notification!");
      return;
    }

    try {
      // For development, we'll skip the push token generation
      // You can add your Expo project ID here if you want remote push notifications
      // token = (await Notifications.getExpoPushTokenAsync({ projectId: 'your-project-id' })).data;
      console.log("Notification permissions granted");
    } catch (e) {
      console.error("Failed to get push token:", e);
    }
  } else {
    alert("Must use physical device for Push Notifications");
  }

  return token;
}

export function setupNotificationListeners(navigation) {
  // Handle notification received while app is running
  const notificationListener = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log("Notification received:", notification);
    }
  );

  // Handle notification tapped
  const responseListener =
    Notifications.addNotificationResponseReceivedListener((response) => {
      const { chatId, otherUser } = response.notification.request.content.data;

      if (chatId && otherUser) {
        // Navigate to chat room
        navigation.navigate("ChatRoom", { chatId, otherUser });
      }
    });

  // Return cleanup function
  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}
