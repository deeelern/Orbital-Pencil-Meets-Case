import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ChatScreen from "../screens/ChatScreen";
import { useNavigation } from "@react-navigation/native";
import { getDoc, onSnapshot } from "firebase/firestore";
import { auth } from "../FirebaseConfig";

jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  return {
    ...actual,
    useNavigation: jest.fn(),
  };
});

jest.mock("../FirebaseConfig", () => ({
  auth: { currentUser: { uid: "user123" } },
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  getDoc: jest.fn(),
  doc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(),
}));

describe("ChatScreen", () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    useNavigation.mockReturnValue({ navigate: mockNavigate });
    jest.clearAllMocks();
  });

  it("renders header and fallback text when no chats", async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ blockedUsers: [] }) });
    onSnapshot.mockImplementation((_, callback) => {
      callback({ docs: [] });
    });

    const { getByText } = render(<ChatScreen />);
    await waitFor(() => expect(getByText("Pencil Meets Case")).toBeTruthy());
    expect(getByText("No chats yet. Go match someone!")).toBeTruthy();
  });

  it("renders a chat item and navigates to ChatRoom", async () => {
    const mockChat = {
      id: "chat1",
      userInfo: {
        uid: "user456",
      },
      lastMessage: "Hello!",
      lastMessageTimestamp: { toDate: () => new Date() },
      unreadCount: 2,
      members: ["user123", "user456"],
    };

    getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ blockedUsers: [] }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          firstName: "Jane",
          lastName: "Doe",
          profileImage: "https://example.com/image.jpg",
          uid: "user456",
        }),
      });

    onSnapshot.mockImplementation((_, callback) => {
      callback({
        docs: [
          {
            id: "chat1",
            data: () => mockChat,
          },
        ],
      });
    });

    const { getByText } = render(<ChatScreen />);
    await waitFor(() => expect(getByText("Jane")).toBeTruthy());
    fireEvent.press(getByText("Jane"));

    expect(mockNavigate).toHaveBeenCalledWith("ChatRoom", {
    chatId: "chat1",
    otherUser: expect.objectContaining({
        uid: "user456",
        id: "user456",
        firstName: "Jane",
        lastName: "Doe",
        profileImage: "https://example.com/image.jpg",
        lastSeen: null,
        online: false,
        }),
    });
  });

  it("does not render chat if user is blocked", async () => {
    const mockChat = {
      id: "chat1",
      userInfo: {
        uid: "blockedUser",
        firstName: "Blocked",
        lastName: "User",
        profileImage: "",
      },
      lastMessage: "You won't see me",
      lastMessageTimestamp: { toDate: () => new Date() },
      unreadCount: 0,
      members: ["user123", "blockedUser"],
    };

    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ blockedUsers: ["blockedUser"] }) });

    onSnapshot.mockImplementation((_, callback) => {
      callback({
        docs: [
          {
            id: "chat1",
            data: () => mockChat,
          },
        ],
      });
    });

    const { queryByText } = render(<ChatScreen />);

    await waitFor(() => {
      expect(queryByText("Blocked User")).toBeNull();
    });
  });

  it("navigates to Home when home icon is pressed", async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ blockedUsers: [] }) });
    onSnapshot.mockImplementation((_, callback) => {
      callback({ docs: [] });
    });

    const { getByTestId } = render(<ChatScreen />);
    const homeIcon = getByTestId("home-icon");

    fireEvent.press(homeIcon);
    expect(mockNavigate).toHaveBeenCalledWith("Home");
  });
});
