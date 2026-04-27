import { describe, it, expect, vi, beforeEach } from "vitest";
import { codeReviewRouter } from "./codeReview";
import * as db from "../db";
import * as storage from "../storage";
import * as llm from "../_core/llm";

// Mock dependencies
vi.mock("../db");
vi.mock("../storage");
vi.mock("../_core/llm");

const mockUser = {
  id: 1,
  openId: "test-user",
  email: "test@example.com",
  name: "Test User",
  loginMethod: "manus",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const mockContext = {
  user: mockUser,
  req: { protocol: "https", headers: {} } as any,
  res: {} as any,
};

describe("codeReviewRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("uploadAndReview", () => {
    it("should upload code and generate analysis", async () => {
      const mockAnalysis = {
        bugs: [
          {
            severity: "high" as const,
            line: 5,
            issue: "Null pointer exception",
            fix: "Add null check",
          },
        ],
        suggestions: [
          {
            category: "Performance",
            suggestion: "Use const instead of let",
            benefit: "Prevents accidental reassignment",
          },
        ],
        explanation: "This code does X and Y.",
      };

      vi.mocked(storage.storagePut).mockResolvedValue({
        key: "test-key",
        url: "/manus-storage/test-key",
      });

      vi.mocked(llm.invokeLLM).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAnalysis),
            },
          },
        ],
      } as any);

      vi.mocked(db.createCodeReview).mockResolvedValue({
        insertId: 1,
      } as any);

      const caller = codeReviewRouter.createCaller(mockContext);

      const result = await caller.uploadAndReview({
        fileName: "test.py",
        fileContent: "print('hello')",
      });

      expect(result).toMatchObject({
        reviewId: 1,
        fileName: "test.py",
        language: "python",
        analysis: mockAnalysis,
      });

      expect(storage.storagePut).toHaveBeenCalled();
      expect(llm.invokeLLM).toHaveBeenCalled();
      expect(db.createCodeReview).toHaveBeenCalled();
    });

    it("should detect language from file extension", async () => {
      const mockAnalysis = {
        bugs: [],
        suggestions: [],
        explanation: "Code explanation",
      };

      vi.mocked(storage.storagePut).mockResolvedValue({
        key: "test-key",
        url: "/manus-storage/test-key",
      });

      vi.mocked(llm.invokeLLM).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAnalysis),
            },
          },
        ],
      } as any);

      vi.mocked(db.createCodeReview).mockResolvedValue({
        insertId: 1,
      } as any);

      const caller = codeReviewRouter.createCaller(mockContext);

      const result = await caller.uploadAndReview({
        fileName: "script.js",
        fileContent: "console.log('test');",
      });

      expect(result.language).toBe("javascript");
    });
  });

  describe("getReview", () => {
    it("should return review for authorized user", async () => {
      const mockReview = {
        id: 1,
        userId: 1,
        fileName: "test.py",
        fileKey: "test-key",
        fileUrl: "/manus-storage/test-key",
        fileContent: "print('hello')",
        language: "python",
        bugs: JSON.stringify([]),
        suggestions: JSON.stringify([]),
        explanation: "Code explanation",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getCodeReviewById).mockResolvedValue(mockReview as any);

      const caller = codeReviewRouter.createCaller(mockContext);
      const result = await caller.getReview({ reviewId: 1 });

      expect(result).toMatchObject({
        id: 1,
        fileName: "test.py",
        language: "python",
      });
      expect(result.bugs).toEqual([]);
      expect(result.suggestions).toEqual([]);
    });

    it("should throw error for unauthorized user", async () => {
      const mockReview = {
        id: 1,
        userId: 999, // Different user
        fileName: "test.py",
        fileKey: "test-key",
        fileUrl: "/manus-storage/test-key",
        fileContent: "print('hello')",
        language: "python",
        bugs: JSON.stringify([]),
        suggestions: JSON.stringify([]),
        explanation: "Code explanation",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getCodeReviewById).mockResolvedValue(mockReview as any);

      const caller = codeReviewRouter.createCaller(mockContext);

      await expect(caller.getReview({ reviewId: 1 })).rejects.toThrow("Unauthorized");
    });
  });

  describe("getHistory", () => {
    it("should return user's code reviews", async () => {
      const mockReviews = [
        {
          id: 1,
          userId: 1,
          fileName: "test1.py",
          fileKey: "key1",
          fileUrl: "/manus-storage/key1",
          fileContent: "code1",
          language: "python",
          bugs: JSON.stringify([]),
          suggestions: JSON.stringify([]),
          explanation: "Explanation 1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          userId: 1,
          fileName: "test2.js",
          fileKey: "key2",
          fileUrl: "/manus-storage/key2",
          fileContent: "code2",
          language: "javascript",
          bugs: JSON.stringify([]),
          suggestions: JSON.stringify([]),
          explanation: "Explanation 2",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(db.getUserCodeReviews).mockResolvedValue(mockReviews as any);

      const caller = codeReviewRouter.createCaller(mockContext);
      const result = await caller.getHistory();

      expect(result).toHaveLength(2);
      expect(result[0].fileName).toBe("test1.py");
      expect(result[1].fileName).toBe("test2.js");
    });
  });

  describe("chat", () => {
    it("should send message and get response", async () => {
      const mockReview = {
        id: 1,
        userId: 1,
        fileName: "test.py",
        fileKey: "test-key",
        fileUrl: "/manus-storage/test-key",
        fileContent: "print('hello')",
        language: "python",
        bugs: JSON.stringify([]),
        suggestions: JSON.stringify([]),
        explanation: "Code explanation",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getCodeReviewById).mockResolvedValue(mockReview as any);
      vi.mocked(db.getReviewChatMessages).mockResolvedValue([]);
      vi.mocked(db.createChatMessage).mockResolvedValue({} as any);
      vi.mocked(llm.invokeLLM).mockResolvedValue({
        choices: [
          {
            message: {
              content: "This code prints hello world.",
            },
          },
        ],
      } as any);

      const caller = codeReviewRouter.createCaller(mockContext);
      const result = await caller.chat({
        reviewId: 1,
        message: "What does this code do?",
      });

      expect(result.message).toBe("This code prints hello world.");
      expect(db.createChatMessage).toHaveBeenCalledTimes(2); // User message + assistant response
    });
  });
});
