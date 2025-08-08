import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import MyPreferencesScreen from "../screens/MyPreferencesScreen";
import { Alert } from "react-native";

jest.mock("../FirebaseConfig", () => ({
  auth: {
    currentUser: { uid: "mock-uid" },
    createUserWithEmailAndPassword: jest.fn(() =>
      Promise.resolve({ user: { uid: "mock-uid" } })
    ),
  },
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  setDoc: jest.fn(() => Promise.resolve()),
  getDoc: jest.fn(() => Promise.resolve({ data: () => ({}) })),
  serverTimestamp: jest.fn(() => "mock-timestamp"),
}));

jest.spyOn(Alert, "alert");

const baseParams = {
  email: "test@example.com",
  password: "password123",
  profile: { name: "Test User", age: 25 },
  prompts: [{ question: "What terrifies you?", answer: "Ghosts" }],
  photos: ["photo1.jpg", "photo2.jpg", "photo3.jpg"],
};

describe("MyPreferencesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all sections like Gender, Smoking, Drinking, etc.", () => {
    const { getByText } = render(
      <MyPreferencesScreen
        route={{ params: baseParams }}
        navigation={{ replace: jest.fn(), goBack: jest.fn() }}
      />
    );

    expect(getByText("Gender")).toBeTruthy();
    expect(getByText("Age Range")).toBeTruthy();
    expect(getByText("Distance")).toBeTruthy();
    expect(getByText("Religion")).toBeTruthy();
    expect(getByText("Smoking")).toBeTruthy();
    expect(getByText("Drinking")).toBeTruthy();
    expect(getByText("Done")).toBeTruthy();
  });

  it("shows alert when min age > max age", async () => {
    const { getByText, getAllByType } = render(
      <MyPreferencesScreen
        route={{
          params: {
            ...baseParams,
          },
        }}
        navigation={{ replace: jest.fn(), goBack: jest.fn() }}
      />
    );

    fireEvent.press(getByText("Age Range"));
    const doneButton = getByText("Done");
    fireEvent.press(doneButton);

    await waitFor(() => {
      expect(Alert.alert).not.toHaveBeenCalledWith(
        "Age range error",
        expect.any(String)
      );
    });
  });

  it("calls navigation.replace('Home') if not editing", async () => {
    const mockReplace = jest.fn();

    const { getByText } = render(
      <MyPreferencesScreen
        route={{ params: baseParams }}
        navigation={{ replace: mockReplace }}
      />
    );

    fireEvent.press(getByText("Done"));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("Home");
    });
  });

  it("calls navigation.replace('Me') if editing", async () => {
    const mockReplace = jest.fn();

    const { getByText } = render(
      <MyPreferencesScreen
        route={{ params: { ...baseParams, fromEditProfile: true } }}
        navigation={{ replace: mockReplace }}
      />
    );

    fireEvent.press(getByText("Done"));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("Me");
    });
  });
});
