import { Routes, Route } from "react-router-dom";
import AppLayout from "./components/app-layout";
import ArticleDetail from "./pages/article-detail";
import NewRequest from "./pages/new-request";
import JobDetail from "./pages/job-detail";
import AdminSectors from "./pages/admin-sectors";
import AdminSectorEditor from "./pages/admin-sector-editor";
import AdminMarketEditor from "./pages/admin-market-editor";
import AdminAudiences from "./pages/admin-audiences";
import AdminAudienceEditor from "./pages/admin-audience-editor";
import AdminEmails from "./pages/admin-emails";
import ReviewQueue from "./pages/review-queue";
import HowItWorks from "./pages/how-it-works";
import PublishedLibrary from "./pages/published-library";
import PublishedArticleDetail from "./pages/published-article-detail";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<PublishedLibrary />} />
        <Route path="/articles/:id" element={<ArticleDetail />} />
        <Route path="/review" element={<ReviewQueue />} />
        <Route path="/new" element={<NewRequest />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/admin/sectors" element={<AdminSectors />} />
        <Route path="/admin/sectors/:id" element={<AdminSectorEditor />} />
        <Route path="/admin/markets/:id" element={<AdminMarketEditor />} />
        <Route path="/admin/audiences" element={<AdminAudiences />} />
        <Route path="/admin/audiences/:id" element={<AdminAudienceEditor />} />
        <Route path="/admin/emails" element={<AdminEmails />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/library" element={<PublishedLibrary />} />
        <Route path="/library/:id" element={<PublishedArticleDetail />} />
      </Route>
    </Routes>
  );
}
