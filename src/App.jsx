import { AppDialogProvider } from "./components/common/AppDialog";
import AppRoutes from "./router/AppRoutes";

export default function App() {
  return (
    <AppDialogProvider>
      <AppRoutes />
    </AppDialogProvider>
  );
}