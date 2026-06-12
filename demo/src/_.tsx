import "../../src/ui/_.css";

import { AppTap } from "../../src/ui/_";

import ButtonsPage from "./pages/ButtonsPage";
import InputsPage from "./pages/InputsPage";
import LayoutPage from "./pages/LayoutPage";
import DisplayPage from "./pages/DisplayPage";
import InteractivePage from "./pages/InteractivePage";
import TabsPage from "./pages/TabsPage";
import HooksPage from "./pages/HooksPage";
import ValidatePage from "./pages/ValidatePage";

import { icon_home, icon_palette, icon_text_fields, icon_dashboard, icon_widgets, icon_touch_app, icon_code, icon_security } from "../../src/ui/svgicons";

const App = () => {
  return (
    <AppTap>
      {[
        { icon: icon_home, panel: () => <ButtonsPage /> },
        { icon: icon_palette, panel: () => <InputsPage /> },
        { icon: icon_text_fields, panel: () => <LayoutPage /> },
        { icon: icon_dashboard, panel: (): any => <DisplayPage /> },
        { icon: icon_widgets, panel: () => <InteractivePage /> },
        { icon: icon_touch_app, panel: () => <TabsPage /> },
        { icon: icon_code, panel: () => <HooksPage /> },
        { icon: icon_security, panel: () => <ValidatePage /> },
      ]}
    </AppTap>
  );
};

export default App;
