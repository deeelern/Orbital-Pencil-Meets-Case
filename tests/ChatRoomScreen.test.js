import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ChatRoomScreen from "../screens/ChatRoomScreen";
import { useRoute, useNavigation } from "@react-navigation/native";
import { getDoc, updateDoc, addDoc, arrayUnion, doc } from "firebase/firestore";
import { Alert } from "react-native";
import { auth } from "../FirebaseConfig";

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
}));

jest.mock("@react-navigation/native", () => ({
  useRoute: jest.fn(),
  useNavigation: jest.fn(),
}));

jest.mock("../FirebaseConfig", () => ({
  auth: { currentUser: { uid: "user123" } },
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  getDoc: jest.fn(),
  doc: jest.fn(() => "mockDocRef"),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(() => () => {}),
  serverTimestamp: jest.fn(),
  increment: jest.fn(),
  arrayUnion: jest.fn((val) => [`existing`, val]),
  arrayRemove: jest.fn(),
}));

describe("ChatRoomScreen", () => {
  const mockNavigate = jest.fn();
  const mockGoBack = jest.fn();
  const mockAlert = jest.spyOn(Alert, "alert");

  beforeEach(() => {
    useRoute.mockReturnValue({
      params: {
        chatId: "chat1",
        otherUser: {
          id: "user456",
          uid: "user456",
          firstName: "Jane",
          lastName: "Doe",
          profileImage: "https://example.com/image.jpg",
        },
      },
    });

    useNavigation.mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
      addListener: () => () => {},
    });

    mockAlert.mockClear();
    jest.clearAllMocks();
  });

  it("renders chat header with user's name", async () => {
    getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ blocked: [] }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ settings: { showOnline: true }, online: true }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          lastReadAt: { toMillis: () => 0 },
          unreadCounts: { user123: 0 },
        }),
      });

    const { getByText } = render(<ChatRoomScreen />);
    await waitFor(() => expect(getByText("Jane")).toBeTruthy());
  });

  it("sends a message", async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ blocked: [] }),
    });

    const { getByPlaceholderText, getByTestId } = render(<ChatRoomScreen />);
    const input = getByPlaceholderText("Type a message...");
    const sendBtn = getByTestId("send-button");

    fireEvent.changeText(input, "Hello Jane");
    fireEvent.press(sendBtn);

    await waitFor(() => {
      expect(addDoc).toHaveBeenCalled();
      expect(updateDoc).toHaveBeenCalled();
    });
  });

  it("does not send empty messages", async () => {
    const { getByTestId } = render(<ChatRoomScreen />);
    fireEvent.press(getByTestId("send-button"));
    expect(addDoc).not.toHaveBeenCalled();
  });

  it("blocks user from options menu", async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({}) });

    const { getByTestId } = render(<ChatRoomScreen />);
    fireEvent.press(getByTestId("options-menu"));

    const blockAction = mockAlert.mock.calls[0][2][0];
    await blockAction.onPress();

    expect(updateDoc).toHaveBeenCalledWith("mockDocRef", expect.objectContaining({
      blocked: expect.anything(),
    }));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it("disables sending message if blocked by other user", async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ blocked: ["user123"] }),
    });

    const { getByPlaceholderText, getByTestId } = render(<ChatRoomScreen />);
    const input = getByPlaceholderText("Type a message...");
    fireEvent.changeText(input, "Blocked test");
    fireEvent.press(getByTestId("send-button"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Blocked", "You cannot message this user.");
    });

    expect(addDoc).not.toHaveBeenCalled();
  });
});
