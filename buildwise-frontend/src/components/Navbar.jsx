import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "i18next";

export default function Navbar() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const changeLang = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
  };

  return (
    <div className="flex flex-wrap justify-between items-center p-6 bg-white shadow">
      <h1 className="text-2xl font-bold text-black">{t("brand")}</h1>

      <div className="flex flex-wrap items-center gap-4">
        <select
          value={i18n.language}
          onChange={(e) => changeLang(e.target.value)}
          className="bg-black text-white border px-2 py-1 rounded"
        >
          <option value="en">EN</option>
          <option value="hi">HI</option>
          <option value="mr">MR</option>
        </select>

        <button onClick={() => navigate("/login")} className="text-sm text-gray-600 hover:text-black">
          {t("nav.login")}
        </button>

        <button
          onClick={() => navigate("/register")}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {t("nav.getStarted")}
        </button>
      </div>
    </div>
  );
}