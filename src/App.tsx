import { Navigate, Route, Routes } from "react-router-dom";
import RecordPage from "./pages/RecordPage";
import MixPage from "./pages/MixPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/record" replace />} />
      <Route path="/record" element={<RecordPage />} />
      <Route path="/mix" element={<MixPage />} />
      <Route path="*" element={<Navigate to="/record" replace />} />
    </Routes>
  );
}
