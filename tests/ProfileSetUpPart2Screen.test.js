// tests/ProfileSetUpPart2Screen.test.js

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ProfileSetUpPart2Screen from "../screens/ProfileSetUpPart2Screen"; // adjust path if needed
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { Alert } from "react-native";

jest.mock("../FirebaseConfig", () => ({
  auth: {
    currentUser: { uid: "mock-uid" },
  },
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(() => "MOCKED_TIMESTAMP"),
}));

jest.mock("@react-navigation/native", () => {
  return {
    useNavigation: () => ({
      goBack: jest.fn(),
      replace: jest.fn(),
      navigate: jest.fn(),
    }),
  };
});

describe("ProfileSetUpPart2Screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all prompts", () => {
    const { getByText } = render(<ProfileSetUpPart2Screen route={{}} />);
    expect(getByText("Pick up to 5 prompts and share your answers")).toBeTruthy();
    expect(getByText("A book everyone should read:")).toBeTruthy();
    expect(getByText("What terrifies you?")).toBeTruthy();
  });

  it("expands a prompt and allows typing", () => {
    const { getByText, getByPlaceholderText } = render(<ProfileSetUpPart2Screen route={{}} />);
    fireEvent.press(getByText("What terrifies you?"));
    const input = getByPlaceholderText("Type your answer here…");
    fireEvent.changeText(input, "Spiders");
    expect(input.props.value).toBe("Spiders");
  });

  it("shows alert if no prompt is answered", async () => {
    jest.spyOn(Alert, "alert");
    const { getByText } = render(<ProfileSetUpPart2Screen route={{}} />);
    fireEvent.press(getByText("Continue"));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Answer at least one prompt",
        "Please respond to at least one question to continue."
      );
    });
  });

  it("shows alert if more than 5 prompts are answered", async () => {
    jest.spyOn(Alert, "alert");
    const { getByText, getAllByPlaceholderText } = render(<ProfileSetUpPart2Screen route={{}} />);

    const promptTexts = [
      "A book everyone should read:",
      "Favorite weird food combo:",
      "I appreciate when my date…",
      "What show do you never get tired of?",
      "What terrifies you?",
      "Hands down, the best first date:",
    ];

    promptTexts.forEach((text, idx) => {
      fireEvent.press(getByText(text));
    });

    const inputs = getAllByPlaceholderText("Type your answer here…");
    inputs.forEach((input, index) => {
      fireEvent.changeText(input, `Answer ${index}`);
    });

    fireEvent.press(getByText("Continue"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Too many answers",
        "You can answer up to 5 prompts only."
      );
    });
  });

  it("navigates to PhotoUpload screen when valid prompts provided", async () => {
    const mockNavigate = jest.fn();
    const { getByText, getByPlaceholderText } = render(
      <ProfileSetUpPart2Screen
        route={{ params: { name: "John", gender: "Male" } }}
        navigation={{ navigate: mockNavigate }}
      />
    );

    fireEvent.press(getByText("What terrifies you?"));
    const input = getByPlaceholderText("Type your answer here…");
    fireEvent.changeText(input, "The ocean");

    fireEvent.press(getByText("Continue"));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("PhotoUpload", expect.objectContaining({
        prompts: [{ prompt: "What terrifies you?", answer: "The ocean" }],
        name: "John",
        gender: "Male",
      }));
    });
  });

  it("calls setDoc and navigates to Me screen in edit mode", async () => {
    const mockReplace = jest.fn();
    const mockProfile = { name: "Jane", age: 22 };

    const { getByText, getByPlaceholderText } = render(
      <ProfileSetUpPart2Screen
        route={{ params: { fromEditProfile: true, profile: mockProfile } }}
        navigation={{ replace: mockReplace }}
      />
    );

    fireEvent.press(getByText("A book everyone should read:"));
    const input = getByPlaceholderText("Type your answer here…");
    fireEvent.changeText(input, "1984 by George Orwell");

    fireEvent.press(getByText("Continue"));

    await waitFor(() => {
      expect(setDoc).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("Me");
    });
  });
});
