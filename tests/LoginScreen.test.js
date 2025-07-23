import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import LoginScreen from "../screens/LoginScreen";

describe("LoginScreen", () => {
  const mockLogin = jest.fn();
  const mockNavigate = jest.fn();

  const setup = () =>
    render(
      <LoginScreen
        onLogin={mockLogin}
        navigation={{ navigate: mockNavigate }}
      />
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all expected elements", () => {
    const { getByPlaceholderText, getByText } = setup();

    expect(getByPlaceholderText("Email")).toBeTruthy();
    expect(getByPlaceholderText("Password")).toBeTruthy();
    expect(getByText("Log In")).toBeTruthy();
    expect(getByText("Forgot Password?")).toBeTruthy();
    expect(getByText("Don’t have an account? Sign Up")).toBeTruthy();
  });

  it("allows user to type email and password", () => {
    const { getByPlaceholderText } = setup();

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");

    fireEvent.changeText(emailInput, "test@example.com");
    fireEvent.changeText(passwordInput, "password123");

    expect(emailInput.props.value).toBe("test@example.com");
    expect(passwordInput.props.value).toBe("password123");
  });

  it("calls onLogin with correct credentials", () => {
    const { getByPlaceholderText, getByText } = setup();

    fireEvent.changeText(getByPlaceholderText("Email"), "user@example.com");
    fireEvent.changeText(getByPlaceholderText("Password"), "pass123");

    fireEvent.press(getByText("Log In"));

    expect(mockLogin).toHaveBeenCalledWith("user@example.com", "pass123");
  });

  it("navigates to SignUp screen on button press", () => {
    const { getByText } = setup();

    fireEvent.press(getByText("Don’t have an account? Sign Up"));

    expect(mockNavigate).toHaveBeenCalledWith("SignUp");
  });
});
