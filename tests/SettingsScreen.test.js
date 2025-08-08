import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import SettingsScreen from "../screens/SettingsScreen";
import { useNavigation } from "@react-navigation/native";
import { getDoc, updateDoc } from "firebase/firestore";
import { auth } from "../FirebaseConfig";
import { signOutUser, deleteUserAccount } from "../utils/authHelpers";
import { Alert } from "react-native";

jest.mock("@react-navigation/native", () => {
  const actualNav = jest.requireActual("@react-navigation/native");
  return {
    ...actualNav,
    useNavigation: jest.fn(),
  };
});
jest.mock("../FirebaseConfig", () => ({
  auth: { currentUser: { uid: "test-user-id" } },
  db: {},
}));
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));
jest.mock("../utils/authHelpers", () => ({
  signOutUser: jest.fn(),
  deleteUserAccount: jest.fn(),
}));

describe("SettingsScreen", () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    useNavigation.mockReturnValue({
      navigate: mockNavigate,
      canGoBack: () => true,
      goBack: jest.fn(),
      replace: jest.fn(),
    });
    jest.clearAllMocks();
  });

  const mockProfileData = {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    prompts: [],
    settings: {
      notifications: true,
      showOnline: true,
      privateMode: false,
      locationSharing: true,
    },
  };

  it("renders user profile and toggles correctly", async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => mockProfileData,
    });

    const { getByText } = render(<SettingsScreen route={{ params: {} }} />);
    await waitFor(() => expect(getByText("John Doe")).toBeTruthy());

    expect(getByText("john@example.com")).toBeTruthy();
    expect(getByText("Push Notifications")).toBeTruthy();
    expect(getByText("Show Online Status")).toBeTruthy();
    expect(getByText("Share My Location")).toBeTruthy();
    expect(getByText("Private Mode")).toBeTruthy();
  });

  it("toggles notification setting", async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => mockProfileData,
    });

    const { getAllByRole } = render(<SettingsScreen route={{ params: {} }} />);
    await waitFor(() => expect(getAllByRole("switch").length).toBeGreaterThan(0));

    const notificationSwitch = getAllByRole("switch")[0];
    fireEvent(notificationSwitch, "valueChange", false);

    await waitFor(() => {
      const call = updateDoc.mock.calls[0][1];
      expect(call.settings).toMatchObject({
        notifications: false,
      });
    });
  });

  it("navigates to Edit Profile", async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => mockProfileData,
    });

    const { getByText } = render(
      <SettingsScreen
        route={{ params: {} }}
        navigation={{ navigate: mockNavigate }}
      />
    );

    await waitFor(() => expect(getByText("Edit Profile")).toBeTruthy());

    fireEvent.press(getByText("Edit Profile"));

    expect(mockNavigate).toHaveBeenCalledWith("ProfileSetup", expect.objectContaining({
      editingMode: true,
      fromMeScreen: true,
      fromEditProfile: true,
    }));
  });

  it("navigates to MyPreferences", async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => mockProfileData,
    });

    const { getByText } = render(
      <SettingsScreen
        route={{ params: {} }}
        navigation={{ navigate: mockNavigate }}
      />
    );

    await waitFor(() => expect(getByText("Dating Preferences")).toBeTruthy());

    fireEvent.press(getByText("Dating Preferences"));

    expect(mockNavigate).toHaveBeenCalledWith("MyPreferences", expect.objectContaining({
      fromMeScreen: true,
      fromEditProfile: true,
    }));
  });

  it("triggers sign out flow", async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => mockProfileData,
    });

    const alertMock = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByText } = render(<SettingsScreen route={{ params: {} }} />);
    await waitFor(() => expect(getByText("Sign Out")).toBeTruthy());

    fireEvent.press(getByText("Sign Out"));

    alertMock.mockRestore();
  });

  it("triggers delete account flow", async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => mockProfileData,
    });

    const alertMock = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByText } = render(<SettingsScreen route={{ params: {} }} />);
    await waitFor(() => expect(getByText("Delete Account")).toBeTruthy());

    fireEvent.press(getByText("Delete Account"));

    alertMock.mockRestore();
  });
});
