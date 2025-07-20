import { Alert } from "react-native";

const isValidPassword = (pwd) => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,}$/;
  return regex.test(pwd);
};

export const handleSignUp = async (email, password, navigation) => {
  if (!email || !password) {
    return Alert.alert("All fields are required");
  }

  if (!isValidPassword(password)) {
    return Alert.alert(
      "Invalid Password",
      "Password must be at least 6 characters and include uppercase, lowercase, number, and special character."
    );
  }

  navigation.navigate("ProfileSetup", {
    email: email.trim(),
    password,
  });
};
