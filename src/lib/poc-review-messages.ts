export type POCReviewMessage = {
  articleId: string;
  sender: string;
  subject: string;
  body: string;
};

// Temporary bridge between the prototype Messages inbox and article detail.
// A production implementation would load the latest blocking thread message
// from the article's server-side conversation record.
const REVIEW_MESSAGES: POCReviewMessage[] = [
  {
    articleId: "ka-0ff5f3a8",
    sender: "Casey Morgan · Team Admin",
    subject: "Changes requested",
    body: "Please clarify the article's purpose, add the intended audience, and confirm the correct knowledge base before you submit it for review again.",
  },
];

export function getPOCReviewMessage(articleId: string): POCReviewMessage | undefined {
  return REVIEW_MESSAGES.find((message) => message.articleId === articleId);
}
