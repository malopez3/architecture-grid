"use client";
import { useEffect, useState } from "react";
import { DECADES } from "../data/decades";
import { COUNTRIES } from "../data/countries";
import { STATES } from "../data/states";
import { Location } from "@/types/location";
import { Building } from "@/types/building";

export default function Home() {
  const [decades, setDecades] = useState<string[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedCell, setSelectedCell] = useState<{
  location: Location;
  decade: string;
} | null>(null);

const [buildings, setBuildings] = useState<Building[]>([]);
const [gameMode, setGameMode] = useState<"learner" | "game">("learner");
const [tries, setTries] = useState(0);
const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
const [incorrectBuildings, setIncorrectBuildings] = useState<Building[]>([]);
const [gameResult, setGameResult] = useState<"correct" | "incorrect" | "failed" | null>(null);
const [completedCells, setCompletedCells] = useState<
  Record<string, Building>
>({});

  useEffect(() => {
  const today = new Date();
  const dayNumber = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));

  const first = dayNumber % DECADES.length;
  const second = (dayNumber + 3) % DECADES.length;
  const third = (dayNumber + 7) % DECADES.length;

  setDecades([
    DECADES[first].name,
    DECADES[second].name,
    DECADES[third].name,
  ]);

  const country1 = dayNumber % COUNTRIES.length;
  let country2 = (dayNumber + 5) % COUNTRIES.length;

  if (country2 === country1) {
      country2 = (country2 + 1) % COUNTRIES.length;
    }

  // Pick 1 state
  const state = (dayNumber + 11) % STATES.length;

  setLocations([
      COUNTRIES[country1],
      COUNTRIES[country2],
      STATES[state],
  ]);
}, []);

// Load buildings for the selected cell
useEffect(() => {
  if (!selectedCell) return;

  async function loadBuildings() {
    let allData: Building[];

    // Load the appropriate JSON
    if (selectedCell.location.type === "country") {
      const filename = selectedCell.location.name
        .toLowerCase()
        .replaceAll(" ", "-");

      const response = await fetch(
        `/skyscrapers/countries/${filename}.json`
      );

      allData = await response.json();
    } else {
      const response = await fetch(
        "/skyscrapers/countries/united-states.json"
      );

      allData = await response.json();

      // Only keep buildings from the selected state
      allData = allData.filter(
        (building) =>
          building.state === selectedCell.location.name
      );
    }

    // Get selected decade
    const startYear = Number(
      selectedCell.decade.slice(0, 4)
    );

    const endYear = startYear + 9;

    // Correct buildings
    const correctBuildings = allData.filter((building) => {
      if (!building.year) return false;

      const year = Number(building.year);

      return year >= startYear && year <= endYear;
    });

    setBuildings(correctBuildings);

    // Reset game state
    setTries(0);
    setGameResult(null);
    setSelectedBuilding(null);

    // If we're in Game Mode, find incorrect buildings
    if (gameMode === "game") {
      const incorrect = allData.filter((building) => {
        if (!building.year) return false;

        const year = Number(building.year);

        // Building must be outside the selected decade
        return year < startYear || year > endYear;
      });

      // Shuffle the incorrect buildings
      const shuffled = [...incorrect].sort(
        () => Math.random() - 0.5
      );

      // Pick 4
      setIncorrectBuildings(shuffled.slice(0, 4));
    } else {
      setIncorrectBuildings([]);
    }
  }

  loadBuildings();
}, [selectedCell, gameMode]);

  // Wait until data is generated
  if (decades.length === 0 || locations.length === 0) {
    return null;
  }

  // Controls what happens after click depending on learner mode or game mode
  function handleBuildingClick(building: Building) {
  // Learner Mode
  if (gameMode === "learner") {
  setSelectedBuilding(building);
  setGameResult("correct");

  if (selectedCell) {
    const cellKey =
      selectedCell.location.name + "-" + selectedCell.decade;

    setCompletedCells((previous) => ({
      ...previous,
      [cellKey]: building,
    }));
  }

  // Close the selection panel
  setSelectedCell(null);

  return;
}

  // Game Mode
  if (!selectedCell) return;

  const startYear = Number(
    selectedCell.decade.slice(0, 4)
  );

  const endYear = startYear + 9;

  const year = Number(building.year);

  const isCorrect =
    year >= startYear &&
    year <= endYear;

  // Correct answer
  if (isCorrect) {
    setSelectedBuilding(building);
    setGameResult("correct");

    const cellKey =
      selectedCell.location.name + "-" + selectedCell.decade;

    setCompletedCells((previous) => ({
      ...previous,
      [cellKey]: building,
    }));

    return;
  }

  // Incorrect answer
  const newTries = tries + 1;

  setTries(newTries);

  if (newTries >= 3) {
    setGameResult("failed");
  } else {
    setGameResult("incorrect");
  }
}

const answerChoices =
  gameMode === "game"
    ? [...buildings, ...incorrectBuildings].sort(
        () => Math.random() - 0.5
      )
    : buildings;

  return (
    // Main page container
    // min-h-screen = at least the full height of the browser
    // Background color set here
    <main className="min-h-screen bg-[#eee2de]">
      {/* Top Black Header */}
      <header className="bg-black text-white h-16 flex items-center px-2 shadow-md">
        <h1 className="text-2xl font-bold tracking-wide">
          ArchitectureGrids.com
        </h1>
      </header>

      {/* Grid Container*/}
      {/* Centers the table horizontally and adds spacing from the header */}
      <div className="flex justify-center pt-6">
        {/* Change table/grid borders */}
        <table className="border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="w-24 sm:w-36 md:w-52"></th>
               {/* Loop through every decade and create one column header */}
              {decades.map((decade) => (
                <th
                  key={decade}
                  className="w-20 sm:w-28 md:w-36 lg:w-44 xl:w-48 h-14 sm:h-16 md:h-18 lg:h-20 text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-center"
                >
                  {/* Display the decade name */}
                  {decade}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
             {/* Create one row for each location */}
            {locations.map((location) => (
              console.log(location),
              <tr key={location.name}>
                {/* Left-side row label */}
                <th className="text-left pr-4 text-base sm:text-lg md:text-xl lg:text-2xl font-bold whitespace-nowrap">
                 {/* Displays country flag and Location name */}
                <span className={`fi fi-${location.flag.toLowerCase().trim()} mr-2 inline-block`} />
                {location.name}
                </th>
                {/* Create one cell for each decade */}
                {/* Color of cells changes here */}
                {decades.map((decade) => {
                  // Create the unique key for this grid cell
                  const cellKey = location.name + "-" + decade;

                  // Check whether this cell already has a completed building
                  const completedBuilding = completedCells[cellKey];

                  return (
                    <td
                      key={cellKey}
                      onClick={() =>
                        setSelectedCell({
                          location,
                          decade,
                        })
                      }
                      className="
                        w-20 h-20
                        sm:w-28 sm:h-28
                        md:w-36 md:h-36
                        lg:w-44 lg:h-44
                        xl:w-48 xl:h-48
                        border-2 border-gray-500
                        bg-[#334155]
                        hover:bg-sky-50
                        rounded-2xl
                        cursor-pointer
                        transition-colors
                        duration-200
                        overflow-hidden
                        relative
                      "
                    >
                      {completedBuilding?.image ? (
                        <img
                          src={completedBuilding.image}
                          alt={completedBuilding.name}
                          className="w-full h-full object-cover"
                        />
                      ) : completedBuilding ? (
                        <div className="w-full h-full flex items-center justify-center p-2 text-white text-center text-sm font-bold">
                          {completedBuilding.name}
                        </div>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
            </div>

      {/* Game mode buttons */}
      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={() => {
            setGameMode("learner");
            setSelectedCell(null);
            setTries(0);
            setGameResult(null);
            setSelectedBuilding(null);
          }}
          className={`px-6 py-3 rounded-lg font-bold transition-colors ${
            gameMode === "learner"
              ? "bg-black text-white"
              : "bg-white text-black border border-gray-400 hover:bg-gray-100"
          }`}
        >
          Learner Mode
        </button>

        <button
          onClick={() => {
            setGameMode("game");
            setSelectedCell(null);
            setTries(0);
            setGameResult(null);
            setSelectedBuilding(null);
          }}
          className={`px-6 py-3 rounded-lg font-bold transition-colors ${
            gameMode === "game"
              ? "bg-black text-white"
              : "bg-white text-black border border-gray-400 hover:bg-gray-100"
          }`}
        >
          Game Mode
        </button>
      </div>

      {selectedCell && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">

          <div className="bg-white rounded-xl p-6 w-[500px] max-h-[600px] overflow-y-auto relative">
            {/* X button */}
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-black text-2xl font-bold"
              onClick={() => setSelectedCell(null)}
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4">
              {selectedCell.location.name} - {selectedCell.decade}
            </h2>

            <p className="mb-4">
              {buildings.length} buildings (correct answers) found
            </p>

            {answerChoices.map((building) => (
            <div
              key={building.wikidata}
              onClick={() => handleBuildingClick(building)}
              className="border p-3 mb-3 rounded hover:bg-gray-100 cursor-pointer flex gap-4"
            >
              {building.image && (
                <img
                  src={building.image}
                  alt={building.name}
                  className="w-24 h-24 object-cover rounded"
                />
              )}

              <div>
                {/* Building name display */}
                <div className="font-bold text-lg">
                  {building.name}
                </div>

                {/* Only show additional information in Learner Mode */}
                {gameMode === "learner" && (
                  <>
                  {/* Building year display */}
                  <div className="text-gray-600">
                    Built: {building.year}
                  </div>
                  {/* Building country display */}
                  <div className="text-gray-600">
                  Country: {selectedCell.location.type === "country"
                    ? selectedCell.location.name
                    : "United States"}
                  </div>
                  {/* If in the USA it displays: Building state display */}
                  {selectedCell.location.type === "state" && (
                    <div className="text-gray-600">
                      State: {selectedCell.location.name}
                    </div>
                )}
                </>
                )}
              </div>
            </div>
          ))}

            <button
              className="mt-4 px-4 py-2 bg-gray-300 rounded"
              onClick={() => setSelectedCell(null)}
            >
              Close
            </button>

          </div>

        </div>
      )}

    </main>
  );
}