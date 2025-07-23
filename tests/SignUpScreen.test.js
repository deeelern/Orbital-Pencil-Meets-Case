import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import SignUpScreen from "../screens/SignUpScreen";

jest.mock("../utils/signUp", () => ({
  handleSignUp: jest.fn(),
}));

const mockNavigate = jest.fn();

const mockNavigation = {
  navigate: mockNavigate,
};

describe("SignUpScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly", () => {
    const { getByPlaceholderText, getByText } = render(
      <SignUpScreen navigation={mockNavigation} />
    );

    expect(getByPlaceholderText("Email")).toBeTruthy();
    expect(getByPlaceholderText("Password")).toBeTruthy();
    expect(getByText("Sign Up")).toBeTruthy();
  });

  it("updates email and password input", () => {
    const { getByPlaceholderText } = render(
      <SignUpScreen navigation={mockNavigation} />
    );

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");

    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.changeText(passwordInput, "Test123!");

    expect(emailInput.props.value).toBe("test@example.com");
    expect(passwordInput.props.value).toBe("Test123!");
  });

  it("calls handleSignUp on Sign Up button press", () => {
    const { getByPlaceholderText, getByText } = render(
      <SignUpScreen navigation={mockNavigation} />
    );

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");

    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.changeText(passwordInput, "Test123!");

    fireEvent.press(getByText("Sign Up"));

    const { handleSignUp } = require("../utils/signUp");
    expect(handleSignUp).toHaveBeenCalledWith(
      "test@example.com",
      "Test123!",
      mockNavigation
    );
  });

  it("navigates to Login screen on 'Already have an account? Log In' press", () => {
    const { getByText } = render(
      <SignUpScreen navigation={mockNavigation} />
    );

    fireEvent.press(getByText("Already have an account? Log In"));
    expect(mockNavigate).toHaveBeenCalledWith("Login");
  });
});
