/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/dom";

import BillsUI from "../views/BillsUI.js";
import Bills from "../containers/Bills.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import router from "../app/Router.js";
jest.mock("../app/Store", () => mockStore);

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window"); // récupère l'icône par son testid
      expect(windowIcon).toHaveClass("active-icon"); //check si l'icône est en surbrillance - on vérifie si l'élément a la classe correspondante
    });
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });
  });
  /* -------------------- test loading screen rendering ------------------- */
  describe("When I am on Bills page but it is loading", () => {
    test("Then, Loading page should be rendered", () => {
      document.body.innerHTML = BillsUI({ loading: true });
      expect(screen.getAllByText("Loading...")).toBeTruthy();
    });
  });
  /* -------------------- test bouton nouvelle note de frais ------------------- */
  describe("When I click on the button to create a new bill", () => {
    test("Then, it should open the NewBill page", () => {
      // défini le chemin d'accès
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      //affiche les données de la page
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "employee",
        })
      );

      const billsContainer = new Bills({
        document,
        onNavigate,
        store: null,
        bills: bills,
        localStorage: window.localStorage,
      });
      document.body.innerHTML = BillsUI({ data: { bills } });

      const openNewBillPage = jest.fn(billsContainer.handleClickNewBill); // créé la fonction à tester
      const buttonNewBill = screen.getByTestId("btn-new-bill"); // récupère le bouton nouvelle note de frais

      buttonNewBill.addEventListener("click", openNewBillPage); // écoute l'évènement au clic
      userEvent.click(buttonNewBill); // simule le clic

      expect(openNewBillPage).toHaveBeenCalled(); // on s'attend à ce que la fonction ait été appellée et donc la page chargée
      expect(screen.getByTestId("form-new-bill")).toBeTruthy(); // vérifie ensuite que le formulaire soit bien présent sur la page
    });
  });
  /* ------------------* test bouton visualiser note de frais ------------------ */
  describe("When I click on the eye icon", () => {
    test("Then, it should open the modal", () => {
      $.fn.modal = jest.fn(); // empêche erreur jQuery

      // défini le chemin d'accès
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };
      // affiche les données de la page
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }));

      document.body.innerHTML = BillsUI({ data: bills });

      const billsContainer = new Bills({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });
      // récupère l'icône oeil
      const iconView = screen.getAllByTestId("icon-eye")[0];
      // créé la fonction à tester
      const openViewModal = jest.fn(
        billsContainer.handleClickIconEye(iconView)
      );

      iconView.addEventListener("click", openViewModal); // écoute l'évènement au clic
      userEvent.click(iconView); // simule le clic

      expect(openViewModal).toHaveBeenCalled(); // on s'attend à ce que la fonction ait été appellée et donc la page chargée
      const modale = screen.getByTestId("modaleFileEmployee"); // on a ajouté un data-testid à la modale dans BillsUI qu'on récupère
      expect(modale).toBeTruthy(); // on s'attend à ce que la modale soit présente
    });
  });
});

// * test d'intégration GET
describe("Given I am a user connected as Employee", () => {
  describe("When I navigate to Bills", () => {
    test("fetches bills from mock API GET", async () => {
      localStorage.setItem(
        "user",
        JSON.stringify({ type: "Employee", email: "a@a" })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByText("Mes notes de frais"));
      expect(screen.getByTestId("tbody")).toBeTruthy();
    });

    describe("When an error occurs on API", () => {
      beforeEach(() => {
        jest.spyOn(mockStore, "bills");
        Object.defineProperty(window, "localStorage", {
          value: localStorageMock,
        });
        window.localStorage.setItem(
          "user",
          JSON.stringify({
            type: "Employee",
            email: "a@a",
          })
        );
        const root = document.createElement("div");
        root.setAttribute("id", "root");
        document.body.appendChild(root);
        router();
      });
      test("fetches bills from an API and fails with 404 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 404"));
            },
          };
        });
        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        const message = screen.getByText(/Erreur 404/);
        expect(message).toBeTruthy();
      });

      test("fetches messages from an API and fails with 500 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 500"));
            },
          };
        });

        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        const message = screen.getByText(/Erreur 500/);
        expect(message).toBeTruthy();
      });
    });
  });
});
