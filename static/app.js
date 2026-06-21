/* ===================================================================
   OCEAN AI — Apex Workspace — Application Logic
   =================================================================== */

(function () {
  'use strict';

  // ---------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------
  const STORAGE_KEY = 'oceanai_conversations_v2';
  const SETTINGS_KEY = 'oceanai_settings_v2';
  const PROJECTS_KEY = 'oceanai_projects_v1';

  const MODEL_CATALOG = [
    { id: 'ocean-flash', name: 'Ocean Flash', desc: 'Fastest responses for everyday tasks like quick questions, simple edits, and casual chat.', tags: ['Fast', 'Low cost'], dot: 'flash' },
    { id: 'ocean-pro', name: 'Ocean Pro', desc: 'Balanced reasoning and speed. The default choice for most conversations and general work.', tags: ['Balanced', 'General purpose'], dot: '' },
    { id: 'ocean-thinking', name: 'Ocean Thinking', desc: 'Extended step-by-step reasoning for math, logic, planning, and multi-step problems.', tags: ['Deep reasoning', 'Slower'], dot: 'think' },
    { id: 'ocean-code', name: 'Ocean Code', desc: 'Tuned for programming — code generation, debugging, refactors, and technical explanations.', tags: ['Engineering', 'Syntax-aware'], dot: 'code' }
  ];

  // Roblox Studio / Luau reference library — legitimate patterns that run inside
  // Roblox's own engine, for scripts you own and have permission to edit.
  // Each file can carry an optional `explain` field: a plain-language walkthrough
  // of how that specific file works, shown under its code block in the detail view.
  const SCRIPT_LIBRARY = [
    {
      id: 'remote-event-basics',
      title: 'Client → Server communication',
      category: 'communication',
      level: 'beginner',
      desc: 'The standard way a LocalScript asks a Script on the server to do something, using a RemoteEvent in ReplicatedStorage.',
      image: 'https://raw.githubusercontent.com/github/explore/main/topics/lua/lua.png',
      imageAlt: 'Lua logo (GitHub topic image)',
      sourceLinks: [
        { label: 'Roblox Docs: RemoteEvent', url: 'https://create.roblox.com/docs/reference/engine/classes/RemoteEvent' },
        { label: 'Roblox Docs: Client-Server model', url: 'https://create.roblox.com/docs/projects/client-server' }
      ],
      files: [
        {
          name: 'ReplicatedStorage/Remotes/RequestReward (RemoteEvent)',
          lang: 'text',
          code: 'Create this as a RemoteEvent instance inside ReplicatedStorage named "RequestReward".',
          explain: 'ReplicatedStorage is visible to both the server and every client, which is why RemoteEvents live there — both sides need to be able to find the same instance.'
        },
        {
          name: 'StarterPlayerScripts/RewardClient.lua (LocalScript)',
          lang: 'lua',
          code: `local ReplicatedStorage = game:GetService("ReplicatedStorage")
local requestReward = ReplicatedStorage.Remotes.RequestReward

local button = script.Parent:WaitForChild("ClaimButton")

button.MouseButton1Click:Connect(function()
	requestReward:FireServer()
end)`,
          explain: 'When the player clicks the button, the client fires the RemoteEvent. FireServer() never sends trusted data by itself — it just signals "this player wants to claim a reward." The server decides what actually happens.'
        },
        {
          name: 'ServerScriptService/RewardServer.lua (Script)',
          lang: 'lua',
          code: `local ReplicatedStorage = game:GetService("ReplicatedStorage")
local requestReward = ReplicatedStorage.Remotes.RequestReward

requestReward.OnServerEvent:Connect(function(player)
	-- Always validate on the server — never trust the client
	local leaderstats = player:FindFirstChild("leaderstats")
	if not leaderstats then return end

	local coins = leaderstats:FindFirstChild("Coins")
	if coins then
		coins.Value += 25
	end
end)`,
          explain: 'OnServerEvent always passes the firing Player as the first argument automatically — you never need to send it yourself. The server re-checks everything before granting the reward, since a modified client could fire the event without actually clicking anything.'
        }
      ]
    },
    {
      id: 'remote-function-roundtrip',
      title: 'Asking the server for data (RemoteFunction)',
      category: 'communication',
      level: 'intermediate',
      desc: 'Unlike a RemoteEvent (fire-and-forget), a RemoteFunction lets the client ask the server a question and wait for an answer — useful for checking shop prices or validating a purchase before showing UI.',
      image: 'https://raw.githubusercontent.com/github/explore/main/topics/lua/lua.png',
      imageAlt: 'Lua logo (GitHub topic image)',
      sourceLinks: [
        { label: 'Roblox Docs: RemoteFunction', url: 'https://create.roblox.com/docs/reference/engine/classes/RemoteFunction' },
        { label: 'Roblox Docs: Remote events and callbacks', url: 'https://create.roblox.com/docs/scripting/events/remote' }
      ],
      files: [
        {
          name: 'ReplicatedStorage/Remotes/GetShopPrice (RemoteFunction)',
          lang: 'text',
          code: 'Create this as a RemoteFunction instance inside ReplicatedStorage named "GetShopPrice".',
          explain: 'RemoteFunctions yield (pause) the calling script until a response comes back, unlike RemoteEvents which fire-and-forget instantly.'
        },
        {
          name: 'ServerScriptService/ShopPriceServer.lua (Script)',
          lang: 'lua',
          code: `local ReplicatedStorage = game:GetService("ReplicatedStorage")
local getShopPrice = ReplicatedStorage.Remotes.GetShopPrice

local prices = {
	Sword = 150,
	Shield = 100,
	Potion = 25
}

getShopPrice.OnServerInvoke = function(player, itemName)
	-- Always validate input — the client can send anything
	if typeof(itemName) ~= "string" then
		return nil
	end
	return prices[itemName]
end`,
          explain: 'OnServerInvoke is a callback, not an event — whatever it returns is sent straight back to the client that invoked it. Type-checking itemName matters because a modified client can call InvokeServer with literally any value.'
        },
        {
          name: 'StarterPlayerScripts/ShopPriceClient.lua (LocalScript)',
          lang: 'lua',
          code: `local ReplicatedStorage = game:GetService("ReplicatedStorage")
local getShopPrice = ReplicatedStorage.Remotes.GetShopPrice

local function showPrice(itemName)
	local price = getShopPrice:InvokeServer(itemName)
	if price then
		print(itemName .. " costs " .. price .. " coins")
	else
		print(itemName .. " is not for sale")
	end
end

showPrice("Sword")`,
          explain: 'InvokeServer() pauses this script until the server\'s OnServerInvoke finishes and returns a value. Avoid calling this in tight loops — each call has network latency.'
        }
      ]
    },
    {
      id: 'datastore-save-load',
      title: 'Saving player data (DataStoreService)',
      category: 'data',
      level: 'intermediate',
      desc: 'Persist player progress between sessions using DataStoreService, with pcall error handling so a failed save never crashes the server.',
      image: 'https://raw.githubusercontent.com/Roblox/luau/master/docs/logo.svg',
      imageAlt: 'Luau language logo (GitHub)',
      sourceLinks: [
        { label: 'Roblox Docs: Data stores', url: 'https://create.roblox.com/docs/cloud-services/data-stores' },
        { label: 'Roblox Docs: Saving player data', url: 'https://create.roblox.com/docs/tutorials/use-case-tutorials/data-storage/save-player-data' }
      ],
      files: [
        {
          name: 'ServerScriptService/PlayerDataHandler.lua (Script)',
          lang: 'lua',
          code: `local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")

local playerStore = DataStoreService:GetDataStore("PlayerCoins_v1")

local function loadData(player)
	local key = "Player_" .. player.UserId
	local success, result = pcall(function()
		return playerStore:GetAsync(key)
	end)

	local leaderstats = Instance.new("Folder")
	leaderstats.Name = "leaderstats"
	leaderstats.Parent = player

	local coins = Instance.new("IntValue")
	coins.Name = "Coins"
	coins.Value = (success and result) or 0
	coins.Parent = leaderstats
end

local function saveData(player)
	local key = "Player_" .. player.UserId
	local leaderstats = player:FindFirstChild("leaderstats")
	if not leaderstats then return end

	local coins = leaderstats:FindFirstChild("Coins")
	if not coins then return end

	local success, err = pcall(function()
		playerStore:SetAsync(key, coins.Value)
	end)

	if not success then
		warn("Failed to save data for " .. player.Name .. ": " .. tostring(err))
	end
end

Players.PlayerAdded:Connect(loadData)
Players.PlayerRemoving:Connect(saveData)

game:BindToClose(function()
	for _, player in ipairs(Players:GetPlayers()) do
		saveData(player)
	end
end)`,
          explain: 'Every DataStore call is wrapped in pcall because GetAsync/SetAsync can fail (rate limits, outages) and an unhandled error here would crash the whole script. The "_v1" suffix on the store name is a habit worth keeping — bumping it later lets you migrate save formats without touching old data. BindToClose makes sure data saves even when the whole server is shutting down, not just when individual players leave.'
        }
      ]
    },
    {
      id: 'tween-service-anim',
      title: 'Smooth UI animation (TweenService)',
      category: 'ui',
      level: 'beginner',
      desc: 'Animate a Frame sliding in and fading in using TweenService — the standard way to make Roblox UI feel polished.',
      image: 'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=800&q=60',
      imageAlt: 'Abstract UI motion design reference',
      sourceLinks: [
        { label: 'Roblox Docs: TweenService', url: 'https://create.roblox.com/docs/reference/engine/classes/TweenService' }
      ],
      files: [
        {
          name: 'StarterGui/PanelAnimator.lua (LocalScript)',
          lang: 'lua',
          code: `local TweenService = game:GetService("TweenService")

local panel = script.Parent:WaitForChild("Panel")
local openButton = script.Parent:WaitForChild("OpenButton")

local closedPosition = UDim2.new(0.5, 0, 1.2, 0)
local openPosition = UDim2.new(0.5, 0, 0.5, 0)

panel.Position = closedPosition
panel.BackgroundTransparency = 1

local tweenInfo = TweenInfo.new(
	0.45,                       -- duration (seconds)
	Enum.EasingStyle.Quint,
	Enum.EasingDirection.Out
)

local isOpen = false

openButton.MouseButton1Click:Connect(function()
	isOpen = not isOpen

	local goal = {
		Position = isOpen and openPosition or closedPosition,
		BackgroundTransparency = isOpen and 0 or 1
	}

	local tween = TweenService:Create(panel, tweenInfo, goal)
	tween:Play()
end)`,
          explain: 'TweenInfo controls timing and feel — EasingStyle.Quint with EasingDirection.Out gives a fast-start, slow-finish motion that reads as "snappy." TweenService:Create() doesn\'t play automatically; you always need to call :Play() on the returned tween object.'
        }
      ]
    },
    {
      id: 'draggable-ui-library',
      title: 'Draggable settings panel (mini UI library)',
      category: 'ui',
      level: 'intermediate',
      desc: 'A small reusable ModuleScript that turns any Frame into a draggable window — the same pattern real Roblox UI libraries use under the hood.',
      image: 'https://raw.githubusercontent.com/Roblox/roact/master/logo.png',
      imageAlt: 'Roblox UI framework reference logo (GitHub)',
      sourceLinks: [
        { label: 'Roblox Docs: GuiObject.Dragging', url: 'https://create.roblox.com/docs/reference/engine/classes/GuiObject' },
        { label: 'Roblox Docs: UserInputService', url: 'https://create.roblox.com/docs/reference/engine/classes/UserInputService' }
      ],
      files: [
        {
          name: 'ReplicatedStorage/Modules/Draggable.lua (ModuleScript)',
          lang: 'lua',
          code: `local UserInputService = game:GetService("UserInputService")

local Draggable = {}

-- Call Draggable.enable(someFrame) to make any Frame drag-movable by its own surface
function Draggable.enable(frame)
	local dragging = false
	local dragStart, startPos

	local function update(input)
		local delta = input.Position - dragStart
		frame.Position = UDim2.new(
			startPos.X.Scale, startPos.X.Offset + delta.X,
			startPos.Y.Scale, startPos.Y.Offset + delta.Y
		)
	end

	frame.InputBegan:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.MouseButton1
			or input.UserInputType == Enum.UserInputType.Touch then
			dragging = true
			dragStart = input.Position
			startPos = frame.Position

			input.Changed:Connect(function()
				if input.UserInputState == Enum.UserInputState.End then
					dragging = false
				end
			end)
		end
	end)

	UserInputService.InputChanged:Connect(function(input)
		if dragging and (input.UserInputType == Enum.UserInputType.MouseMovement
			or input.UserInputType == Enum.UserInputType.Touch) then
			update(input)
		end
	end)
end

return Draggable`,
          explain: 'Handling both MouseButton1 and Touch in the same branch means this works on desktop and mobile without separate code paths. The delta math keeps the existing Scale component of Position and only adjusts the Offset, so the frame still resizes correctly if the screen changes size.'
        },
        {
          name: 'StarterGui/SettingsPanel/Init.lua (LocalScript)',
          lang: 'lua',
          code: `local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Draggable = require(ReplicatedStorage.Modules.Draggable)

local panel = script.Parent:WaitForChild("SettingsFrame")
Draggable.enable(panel)`,
          explain: 'This is the entire integration cost — one require() and one function call. That\'s the point of factoring drag logic into a ModuleScript: any UI panel in the game can become draggable with two lines.'
        }
      ]
    },
    {
      id: 'dropdown-menu-ui',
      title: 'Dropdown / select menu component',
      category: 'ui',
      level: 'intermediate',
      desc: 'A reusable dropdown menu ModuleScript — click to expand a list of options, click one to select it and fire a callback. The same building block used in settings menus and shop filters.',
      image: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&q=60',
      imageAlt: 'UI menu design reference image',
      sourceLinks: [
        { label: 'Roblox Docs: UIListLayout', url: 'https://create.roblox.com/docs/reference/engine/classes/UIListLayout' },
        { label: 'Roblox Docs: GuiButton', url: 'https://create.roblox.com/docs/reference/engine/classes/GuiButton' }
      ],
      files: [
        {
          name: 'ReplicatedStorage/Modules/Dropdown.lua (ModuleScript)',
          lang: 'lua',
          code: `local Dropdown = {}
Dropdown.__index = Dropdown

-- frame: the container Frame, header: a TextButton showing the current value,
-- optionsFrame: a Frame (with a UIListLayout) holding one TextButton per option
function Dropdown.new(header, optionsFrame, options, onSelect)
	local self = setmetatable({}, Dropdown)
	self.header = header
	self.optionsFrame = optionsFrame
	self.expanded = false

	optionsFrame.Visible = false

	for _, optionName in ipairs(options) do
		local button = Instance.new("TextButton")
		button.Text = optionName
		button.Size = UDim2.new(1, 0, 0, 30)
		button.Parent = optionsFrame

		button.MouseButton1Click:Connect(function()
			header.Text = optionName
			self:toggle(false)
			if onSelect then
				onSelect(optionName)
			end
		end)
	end

	header.MouseButton1Click:Connect(function()
		self:toggle(not self.expanded)
	end)

	return self
end

function Dropdown:toggle(shouldExpand)
	self.expanded = shouldExpand
	self.optionsFrame.Visible = shouldExpand
end

return Dropdown`,
          explain: 'Using setmetatable lets each Dropdown instance keep its own state (expanded, header, etc.) while sharing the same methods — this is Luau\'s standard OOP pattern. The UIListLayout you add to optionsFrame in Studio handles stacking the option buttons vertically; this script only needs to create and parent them.'
        },
        {
          name: 'StarterGui/SettingsMenu/Init.lua (LocalScript)',
          lang: 'lua',
          code: `local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Dropdown = require(ReplicatedStorage.Modules.Dropdown)

local header = script.Parent:WaitForChild("DifficultyHeader")
local optionsFrame = script.Parent:WaitForChild("DifficultyOptions")

Dropdown.new(header, optionsFrame, { "Easy", "Normal", "Hard" }, function(selected)
	print("Difficulty set to: " .. selected)
end)`,
          explain: 'The onSelect callback is where you\'d actually apply the chosen difficulty — for example firing a RemoteEvent to tell the server, or saving it into a settings table.'
        }
      ]
    },
    {
      id: 'leaderstats-setup',
      title: 'Leaderboard stats (leaderstats)',
      category: 'gameplay',
      level: 'beginner',
      desc: 'The folder-and-IntValue convention Roblox uses to automatically display player stats in the in-game leaderboard.',
      image: 'https://tr.rbxcdn.com/180DAY-00000000000000000000000000000000/420/420/Image/Png',
      imageAlt: 'Roblox asset thumbnail (rbxcdn placeholder example)',
      sourceLinks: [
        { label: 'Roblox Docs: leaderstats', url: 'https://create.roblox.com/docs/players/leaderboards' }
      ],
      files: [
        {
          name: 'ServerScriptService/LeaderstatsSetup.lua (Script)',
          lang: 'lua',
          code: `local Players = game:GetService("Players")

Players.PlayerAdded:Connect(function(player)
	local leaderstats = Instance.new("Folder")
	leaderstats.Name = "leaderstats"
	leaderstats.Parent = player

	local coins = Instance.new("IntValue")
	coins.Name = "Coins"
	coins.Value = 0
	coins.Parent = leaderstats

	local wins = Instance.new("IntValue")
	wins.Name = "Wins"
	wins.Value = 0
	wins.Parent = leaderstats
end)`,
          explain: 'The name "leaderstats" is not arbitrary — Roblox\'s built-in leaderboard UI specifically looks for a Folder with that exact name inside each Player, and automatically displays any value objects inside it. Rename it and the leaderboard stops showing your stats.'
        }
      ]
    },
    {
      id: 'module-script-pattern',
      title: 'Reusable game logic (ModuleScript)',
      category: 'architecture',
      level: 'beginner',
      desc: 'How to structure shared logic in a ModuleScript so both server scripts and other modules can require() and reuse it cleanly.',
      image: 'https://raw.githubusercontent.com/JohnnyMorganz/luau-lsp/main/img/icon.png',
      imageAlt: 'Luau tooling icon (GitHub)',
      sourceLinks: [
        { label: 'Roblox Docs: ModuleScript', url: 'https://create.roblox.com/docs/reference/engine/classes/ModuleScript' }
      ],
      files: [
        {
          name: 'ServerScriptService/Modules/EconomyService.lua (ModuleScript)',
          lang: 'lua',
          code: `local EconomyService = {}

function EconomyService.addCoins(player, amount)
	local leaderstats = player:FindFirstChild("leaderstats")
	if not leaderstats then return false end

	local coins = leaderstats:FindFirstChild("Coins")
	if not coins then return false end

	coins.Value += amount
	return true
end

function EconomyService.canAfford(player, cost)
	local leaderstats = player:FindFirstChild("leaderstats")
	local coins = leaderstats and leaderstats:FindFirstChild("Coins")
	return coins ~= nil and coins.Value >= cost
end

return EconomyService`,
          explain: 'A ModuleScript only runs once per require() call — Roblox caches the returned table, so every script that requires EconomyService shares the exact same functions rather than getting separate copies.'
        },
        {
          name: 'ServerScriptService/ShopHandler.lua (Script)',
          lang: 'lua',
          code: `local EconomyService = require(script.Parent.Modules.EconomyService)

local function purchaseItem(player, itemCost)
	if EconomyService.canAfford(player, itemCost) then
		EconomyService.addCoins(player, -itemCost)
		return true
	end
	return false
end`,
          explain: 'Notice this script never touches leaderstats directly — all of that logic is hidden inside EconomyService. That separation means if you ever change how currency is stored, you only edit one file.'
        }
      ]
    },
    {
      id: 'proximity-prompt-interact',
      title: 'Interact-to-open door (ProximityPrompt)',
      category: 'gameplay',
      level: 'beginner',
      desc: 'The built-in way to let a player walk up to an object and press a key to interact with it — used for doors, pickups, levers, and NPC dialogue triggers.',
      image: 'https://images.unsplash.com/photo-1605379399642-870262d3d051?w=800&q=60',
      imageAlt: 'Wooden door reference image for an interact prompt example',
      sourceLinks: [
        { label: 'Roblox Docs: ProximityPrompt', url: 'https://create.roblox.com/docs/reference/engine/classes/ProximityPrompt' },
        { label: 'Roblox Docs: Proximity prompts guide', url: 'https://create.roblox.com/docs/tutorials/use-case-tutorials/ui/proximity-prompts' }
      ],
      files: [
        {
          name: 'Workspace/Door/ProximityPrompt (instance settings)',
          lang: 'text',
          code: `Add a ProximityPrompt as a child of the door Part.
Suggested properties:
  ActionText  = "Open"
  ObjectText  = "Wooden Door"
  HoldDuration = 0.3
  MaxActivationDistance = 8`,
          explain: 'ProximityPrompt handles the on-screen UI, input detection (keyboard/gamepad/touch), and distance checking automatically — you only need to react to its Triggered event.'
        },
        {
          name: 'ServerScriptService/DoorHandler.lua (Script)',
          lang: 'lua',
          code: `local door = script.Parent
local prompt = door:WaitForChild("ProximityPrompt")

local isOpen = false
local closedCFrame = door.CFrame
local openCFrame = closedCFrame * CFrame.Angles(0, math.rad(90), 0)

prompt.Triggered:Connect(function(playerWhoTriggered)
	isOpen = not isOpen
	door.CFrame = isOpen and openCFrame or closedCFrame
	prompt.ActionText = isOpen and "Close" or "Open"
end)`,
          explain: 'Multiplying CFrames (closedCFrame * CFrame.Angles(...)) rotates the door around its own pivot rather than around the world origin, which is what keeps a swinging door looking correct instead of teleporting oddly.'
        }
      ]
    },
    {
      id: 'humanoid-damage-healing',
      title: 'Damage and healing (Humanoid)',
      category: 'gameplay',
      level: 'beginner',
      desc: 'How to safely change a player\'s health, listen for death, and respawn handling using the Humanoid object — the basis for any combat or hazard system.',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=60',
      imageAlt: 'Health bar / game UI reference image',
      sourceLinks: [
        { label: 'Roblox Docs: Humanoid', url: 'https://create.roblox.com/docs/reference/engine/classes/Humanoid' }
      ],
      files: [
        {
          name: 'ServerScriptService/HazardPart.lua (Script)',
          lang: 'lua',
          code: `local hazard = script.Parent -- a Part that damages players on touch
local damageAmount = 10
local debounceTime = 1
local touchCooldowns = {}

local function onTouch(otherPart)
	local character = otherPart.Parent
	local humanoid = character and character:FindFirstChild("Humanoid")
	if not humanoid or humanoid.Health <= 0 then return end

	if touchCooldowns[character] then return end
	touchCooldowns[character] = true

	humanoid.Health -= damageAmount

	task.wait(debounceTime)
	touchCooldowns[character] = nil
end

hazard.Touched:Connect(onTouch)`,
          explain: 'The touchCooldowns table is a debounce — without it, Touched can fire dozens of times per second while a character overlaps the hazard, instantly draining health. Keying the cooldown by character (not by player) means the check resets cleanly each time they respawn.'
        },
        {
          name: 'ServerScriptService/RespawnHandler.lua (Script)',
          lang: 'lua',
          code: `local Players = game:GetService("Players")

local function onCharacterAdded(character)
	local humanoid = character:WaitForChild("Humanoid")

	humanoid.Died:Connect(function()
		print(character.Name .. " has died")
		-- Roblox automatically respawns the player after Player.RespawnTime
	end)
end

local function onPlayerAdded(player)
	player.CharacterAdded:Connect(onCharacterAdded)
end

Players.PlayerAdded:Connect(onPlayerAdded)`,
          explain: 'CharacterAdded fires every time a character spawns — including respawns, not just the first one — so reconnecting Died inside it ensures the death-handling logic keeps working across the whole play session.'
        }
      ]
    },
    {
      id: 'simple-state-machine',
      title: 'Game state machine (waiting → playing → ended)',
      category: 'architecture',
      level: 'advanced',
      desc: 'A minimal round-based state machine pattern for managing game phases, commonly used as the backbone of minigames and round-based experiences.',
      image: 'https://raw.githubusercontent.com/Roblox/luau/master/docs/logo.svg',
      imageAlt: 'Luau language logo (GitHub)',
      sourceLinks: [
        { label: 'Roblox Docs: BindableEvent', url: 'https://create.roblox.com/docs/reference/engine/classes/BindableEvent' },
        { label: 'Roblox Docs: Bindable events and callbacks', url: 'https://create.roblox.com/docs/scripting/events/bindable' }
      ],
      files: [
        {
          name: 'ServerScriptService/Modules/GameStateMachine.lua (ModuleScript)',
          lang: 'lua',
          code: `local GameStateMachine = {}
GameStateMachine.__index = GameStateMachine

local STATES = { "Waiting", "Starting", "Playing", "Ended" }

function GameStateMachine.new()
	local self = setmetatable({}, GameStateMachine)
	self.current = "Waiting"
	self.stateChanged = Instance.new("BindableEvent")
	return self
end

function GameStateMachine:transition(newState)
	local isValid = table.find(STATES, newState) ~= nil
	if not isValid then
		warn("Invalid state: " .. tostring(newState))
		return
	end

	local previous = self.current
	self.current = newState
	self.stateChanged:Fire(previous, newState)
end

function GameStateMachine:onStateChanged(callback)
	return self.stateChanged.Event:Connect(callback)
end

return GameStateMachine`,
          explain: 'BindableEvent is the same idea as a RemoteEvent but for communication within a single side (server-to-server scripts, or client-to-client), with no network boundary crossing. table.find guards against typos like "Plaing" silently breaking your game logic.'
        },
        {
          name: 'ServerScriptService/RoundManager.lua (Script)',
          lang: 'lua',
          code: `local GameStateMachine = require(script.Parent.Modules.GameStateMachine)

local game_ = GameStateMachine.new()

game_:onStateChanged(function(previous, current)
	print("Game state: " .. previous .. " -> " .. current)
end)

task.wait(5)
game_:transition("Starting")
task.wait(3)
game_:transition("Playing")
task.wait(60)
game_:transition("Ended")`,
          explain: 'In a real round system, each transition would also trigger gameplay changes — teleporting players, enabling damage, opening a results screen — by connecting more handlers in onStateChanged rather than scattering that logic throughout the codebase.'
        }
      ]
    },
    {
      id: 'pathfinding-npc',
      title: 'NPC walks to a target (PathfindingService)',
      category: 'gameplay',
      level: 'advanced',
      desc: 'Make a non-player character navigate around obstacles toward a destination using Roblox\'s built-in pathfinding, including handling jumps and dead ends.',
      image: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=800&q=60',
      imageAlt: 'Path / maze navigation reference image',
      sourceLinks: [
        { label: 'Roblox Docs: PathfindingService', url: 'https://create.roblox.com/docs/reference/engine/classes/PathfindingService' },
        { label: 'Roblox Docs: Path', url: 'https://create.roblox.com/docs/reference/engine/classes/Path' }
      ],
      files: [
        {
          name: 'ServerScriptService/NpcPathfinder.lua (Script)',
          lang: 'lua',
          code: `local PathfindingService = game:GetService("PathfindingService")

local npc = script.Parent
local humanoid = npc:WaitForChild("Humanoid")
local rootPart = npc:WaitForChild("HumanoidRootPart")

local function walkTo(destination)
	local path = PathfindingService:CreatePath({
		AgentRadius = 2,
		AgentHeight = 5,
		AgentCanJump = true
	})

	local success = pcall(function()
		path:ComputeAsync(rootPart.Position, destination)
	end)

	if not success or path.Status ~= Enum.PathStatus.Success then
		warn("No path found")
		return
	end

	for _, waypoint in ipairs(path:GetWaypoints()) do
		if waypoint.Action == Enum.PathWaypointAction.Jump then
			humanoid.Jump = true
		end
		humanoid:MoveTo(waypoint.Position)
		humanoid.MoveToFinished:Wait()
	end
end

walkTo(Vector3.new(20, 0, 10))`,
          explain: 'ComputeAsync can fail outright (hence the pcall) and can also succeed while returning a path.Status that isn\'t Success — for example PartialSuccess when the destination is unreachable. Checking both is what separates a robust pathfinding script from one that silently walks NPCs into walls.'
        }
      ]
    },
    {
      id: 'raycast-hitscan',
      title: 'Hitscan raycasting (tool / weapon detection)',
      category: 'gameplay',
      level: 'intermediate',
      desc: 'Use a Raycast to detect what a player is pointing at — the foundation of hitscan tools, laser pointers, and click-to-target systems.',
      image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=60',
      imageAlt: 'Laser / line trace reference image',
      sourceLinks: [
        { label: 'Roblox Docs: Workspace:Raycast', url: 'https://create.roblox.com/docs/reference/engine/classes/WorldRoot' },
        { label: 'Roblox Docs: RaycastParams', url: 'https://create.roblox.com/docs/reference/engine/datatypes/RaycastParams' }
      ],
      files: [
        {
          name: 'StarterPlayerScripts/HitscanTool.lua (LocalScript)',
          lang: 'lua',
          code: `local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local mouse = player:GetMouse()
local tool = script.Parent

local fireRemote = ReplicatedStorage.Remotes.ToolFired

tool.Activated:Connect(function()
	local character = player.Character
	local origin = character.HumanoidRootPart.Position
	local direction = (mouse.Hit.Position - origin).Unit * 100

	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	params.FilterDescendantsInstances = { character }

	local result = workspace:Raycast(origin, direction, params)

	if result then
		fireRemote:FireServer(result.Instance, result.Position)
	end
end)`,
          explain: 'RaycastParams with FilterType.Exclude stops the ray from immediately hitting the shooter\'s own character. The actual damage decision should never happen on the client — this script only reports what it thinks it hit; the server should re-validate the shot (distance, line of sight) before applying any effect, since this LocalScript\'s result can be manipulated.'
        }
      ]
    },
    {
      id: 'sound-effects',
      title: 'Playing sound effects (SoundService)',
      category: 'ui',
      level: 'beginner',
      desc: 'How to play one-shot sound effects (UI clicks, pickups) versus looping ambient sound, and why each needs a different approach.',
      image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=60',
      imageAlt: 'Audio waveform reference image',
      sourceLinks: [
        { label: 'Roblox Docs: Sound', url: 'https://create.roblox.com/docs/reference/engine/classes/Sound' },
        { label: 'Roblox Docs: SoundService', url: 'https://create.roblox.com/docs/reference/engine/classes/SoundService' }
      ],
      files: [
        {
          name: 'ReplicatedStorage/Modules/SoundPlayer.lua (ModuleScript)',
          lang: 'lua',
          code: `local SoundPlayer = {}

-- One-shot sound effect, e.g. button clicks or pickups
function SoundPlayer.playOneShot(soundId, parent)
	local sound = Instance.new("Sound")
	sound.SoundId = soundId
	sound.Parent = parent or workspace

	sound:Play()
	sound.Ended:Connect(function()
		sound:Destroy()
	end)
end

-- Looping ambient sound that can be stopped later
function SoundPlayer.playLoop(soundId, parent)
	local sound = Instance.new("Sound")
	sound.SoundId = soundId
	sound.Looped = true
	sound.Parent = parent

	sound:Play()
	return sound -- caller keeps this to stop it later with sound:Stop()
end

return SoundPlayer`,
          explain: 'One-shot sounds clean themselves up via sound.Ended so they don\'t pile up as orphaned instances over a long play session. Looping sounds return the Sound object instead, since the caller needs a reference to stop it later — there\'s no natural "Ended" moment for a loop.'
        },
        {
          name: 'StarterGui/ButtonClick.lua (LocalScript)',
          lang: 'lua',
          code: `local ReplicatedStorage = game:GetService("ReplicatedStorage")
local SoundPlayer = require(ReplicatedStorage.Modules.SoundPlayer)

local button = script.Parent

button.MouseButton1Click:Connect(function()
	SoundPlayer.playOneShot("rbxassetid://6895079853")
end)`,
          explain: 'rbxassetid:// links point to audio assets uploaded to Roblox — every built-in or purchased sound has a numeric ID you reference this way.'
        }
      ]
    },
    {
      id: 'animation-track-play',
      title: 'Playing character animations (AnimationTrack)',
      category: 'gameplay',
      level: 'intermediate',
      desc: 'Load and play a custom animation on a character\'s Animator, including controlling speed and listening for when it finishes.',
      image: 'https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=800&q=60',
      imageAlt: 'Character motion / animation reference image',
      sourceLinks: [
        { label: 'Roblox Docs: AnimationTrack', url: 'https://create.roblox.com/docs/reference/engine/classes/AnimationTrack' },
        { label: 'Roblox Docs: Play character animations', url: 'https://create.roblox.com/docs/tutorials/use-case-tutorials/animation/play-character-animations' }
      ],
      files: [
        {
          name: 'StarterPlayerScripts/PlayEmote.lua (LocalScript)',
          lang: 'lua',
          code: `local Players = game:GetService("Players")

local player = Players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()
local humanoid = character:WaitForChild("Humanoid")
local animator = humanoid:WaitForChild("Animator")

local animation = Instance.new("Animation")
animation.AnimationId = "rbxassetid://507771019" -- example wave animation

local track = animator:LoadAnimation(animation)
track.Priority = Enum.AnimationPriority.Action
track:Play()

track.Stopped:Connect(function()
	print("Emote finished")
end)`,
          explain: 'AnimationPriority.Action makes this animation override lower-priority animations like idle/walk while it plays, then automatically fall back to them when it stops — that\'s how emotes layer on top of normal movement instead of fighting it.'
        }
      ]
    },
    {
      id: 'collection-service-tags',
      title: 'Tagging groups of objects (CollectionService)',
      category: 'architecture',
      level: 'intermediate',
      desc: 'Instead of hardcoding object names, tag instances with CollectionService and write one script that automatically applies to every tagged object — including ones added later.',
      image: 'https://raw.githubusercontent.com/Roblox/luau/master/docs/logo.svg',
      imageAlt: 'Luau language logo (GitHub)',
      sourceLinks: [
        { label: 'Roblox Docs: CollectionService', url: 'https://create.roblox.com/docs/reference/engine/classes/CollectionService' }
      ],
      files: [
        {
          name: 'ServerScriptService/CoinCollector.lua (Script)',
          lang: 'lua',
          code: `local CollectionService = game:GetService("CollectionService")

local TAG = "Collectible"

local function setupCoin(coin)
	local debounce = false

	coin.Touched:Connect(function(hit)
		if debounce then return end
		local character = hit.Parent
		local player = game.Players:GetPlayerFromCharacter(character)
		if not player then return end

		debounce = true
		coin:Destroy()
	end)
end

-- Apply to every part already tagged "Collectible" in the game
for _, coin in ipairs(CollectionService:GetTagged(TAG)) do
	setupCoin(coin)
end

-- Automatically handle any new ones tagged later (e.g. spawned at runtime)
CollectionService:GetInstanceAddedSignal(TAG):Connect(setupCoin)`,
          explain: 'GetTagged() handles everything that exists right now; GetInstanceAddedSignal() handles everything tagged in the future — together they mean designers can tag new coin parts directly in Studio (or scripts can spawn new ones) without ever touching this script again.'
        }
      ]
    },
    {
      id: 'input-keyboard-gamepad',
      title: 'Cross-platform input (keyboard, gamepad, touch)',
      category: 'gameplay',
      level: 'intermediate',
      desc: 'Detect a single game action consistently across keyboard, gamepad, and touchscreen using ContextActionService, instead of writing separate input code for each.',
      image: 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=800&q=60',
      imageAlt: 'Game controller reference image',
      sourceLinks: [
        { label: 'Roblox Docs: ContextActionService', url: 'https://create.roblox.com/docs/reference/engine/classes/ContextActionService' },
        { label: 'Roblox Docs: UserInputService', url: 'https://create.roblox.com/docs/reference/engine/classes/UserInputService' }
      ],
      files: [
        {
          name: 'StarterPlayerScripts/InteractAction.lua (LocalScript)',
          lang: 'lua',
          code: `local ContextActionService = game:GetService("ContextActionService")

local function onInteract(actionName, inputState, inputObject)
	if inputState ~= Enum.UserInputState.Begin then return end
	print("Interact pressed via: " .. inputObject.UserInputType.Name)
	-- Run your interact logic here
end

ContextActionService:BindAction(
	"Interact",
	onInteract,
	true, -- creates an on-screen touch button automatically
	Enum.KeyCode.E,
	Enum.KeyCode.ButtonX
)`,
          explain: 'BindAction\'s third argument (true) is what auto-generates a touch button on mobile — you get keyboard, gamepad, and touch support from one function call instead of three separate input listeners.'
        }
      ]
    },
    {
      id: 'httpservice-external-api',
      title: 'Calling an external API (HttpService)',
      category: 'data',
      level: 'advanced',
      desc: 'Make an HTTP request from a server script to an external web API and parse the JSON response — useful for webhooks, leaderboards, or moderation services.',
      image: 'https://raw.githubusercontent.com/github/explore/main/topics/lua/lua.png',
      imageAlt: 'Lua logo (GitHub topic image)',
      sourceLinks: [
        { label: 'Roblox Docs: HttpService', url: 'https://create.roblox.com/docs/reference/engine/classes/HttpService' }
      ],
      files: [
        {
          name: 'ServerScriptService/WebhookNotifier.lua (Script)',
          lang: 'lua',
          code: `local HttpService = game:GetService("HttpService")

local function sendWebhook(message)
	local payload = HttpService:JSONEncode({
		content = message
	})

	local success, response = pcall(function()
		return HttpService:PostAsync(
			"https://your-webhook-endpoint.example.com/notify",
			payload,
			Enum.HttpContentType.ApplicationJson
		)
	end)

	if not success then
		warn("Webhook failed: " .. tostring(response))
	end
end

sendWebhook("A new server has started!")`,
          explain: 'HttpService requests must be wrapped in pcall — network calls fail far more often than local code, and Studio requires "Allow HTTP Requests" to be enabled in Game Settings before this works at all. Never put API keys directly in a script that might be exposed; prefer a server-only ModuleScript that isn\'t replicated to clients.'
        }
      ]
    },
    {
      id: 'gamepass-check',
      title: 'Checking gamepass ownership (MarketplaceService)',
      category: 'data',
      level: 'intermediate',
      desc: 'Verify whether a player owns a specific gamepass before granting a perk, and prompt the purchase popup if they don\'t.',
      image: 'https://raw.githubusercontent.com/Roblox/luau/master/docs/logo.svg',
      imageAlt: 'Luau language logo (GitHub)',
      sourceLinks: [
        { label: 'Roblox Docs: MarketplaceService', url: 'https://create.roblox.com/docs/reference/engine/classes/MarketplaceService' }
      ],
      files: [
        {
          name: 'ServerScriptService/GamepassPerk.lua (Script)',
          lang: 'lua',
          code: `local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")

local SPEED_GAMEPASS_ID = 123456789 -- replace with your real gamepass ID

local function applyPerkIfOwned(player)
	local success, ownsPass = pcall(function()
		return MarketplaceService:UserOwnsGamePassAsync(player.UserId, SPEED_GAMEPASS_ID)
	end)

	if success and ownsPass then
		local character = player.Character or player.CharacterAdded:Wait()
		character.Humanoid.WalkSpeed = 24
	end
end

Players.PlayerAdded:Connect(function(player)
	player.CharacterAdded:Connect(function()
		applyPerkIfOwned(player)
	end)
end)`,
          explain: 'UserOwnsGamePassAsync makes a network call to Roblox\'s servers every time, so it\'s wrapped in pcall like any other Async function. Checking ownership again on every CharacterAdded (not just once at join) means the perk reapplies correctly after every respawn.'
        }
      ]
    },
    {
      id: 'ui-scaling-responsive',
      title: 'Responsive UI across screen sizes (UIAspectRatioConstraint)',
      category: 'ui',
      level: 'beginner',
      desc: 'Keep a UI element\'s proportions consistent across phone, tablet, and desktop screens using scale-based sizing and aspect ratio constraints instead of fixed pixel offsets.',
      image: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&q=60',
      imageAlt: 'Responsive design / multiple screen sizes reference image',
      sourceLinks: [
        { label: 'Roblox Docs: UIAspectRatioConstraint', url: 'https://create.roblox.com/docs/reference/engine/classes/UIAspectRatioConstraint' },
        { label: 'Roblox Docs: GuiObject', url: 'https://create.roblox.com/docs/reference/engine/classes/GuiObject' }
      ],
      files: [
        {
          name: 'StarterGui notes (Studio setup, not a script)',
          lang: 'text',
          code: `For any UI Frame/ImageLabel that must keep its shape on every device:

1. Set Size using Scale (e.g. {0.3, 0, 0.3, 0}) instead of Offset pixels.
2. Add a UIAspectRatioConstraint as a child.
   - Set AspectRatio to width / height of your design (e.g. 1.5 for a 3:2 card)
3. Set Position using Scale + AnchorPoint = 0.5, 0.5 to keep it centered
   regardless of screen resolution.`,
          explain: 'Scale-based sizing means "30% of the screen" rather than "300 pixels" — the former looks consistent on a phone and a 4K monitor, the latter does not. UIAspectRatioConstraint then locks the width-to-height ratio so the element never gets visually squashed or stretched as the screen shape changes.'
        }
      ]
    },
    {
      id: 'chat-command-system',
      title: 'Simple chat command system (TextChatService)',
      category: 'communication',
      level: 'advanced',
      desc: 'Listen for chat messages starting with a prefix (like "!") and trigger server-side actions — the basis of admin commands and chat-based minigame triggers.',
      image: 'https://raw.githubusercontent.com/github/explore/main/topics/lua/lua.png',
      imageAlt: 'Lua logo (GitHub topic image)',
      sourceLinks: [
        { label: 'Roblox Docs: TextChatService', url: 'https://create.roblox.com/docs/reference/engine/classes/TextChatService' }
      ],
      files: [
        {
          name: 'ServerScriptService/ChatCommands.lua (Script)',
          lang: 'lua',
          code: `local TextChatService = game:GetService("TextChatService")
local Players = game:GetService("Players")

local PREFIX = "!"

local commands = {
	heal = function(player)
		local character = player.Character
		local humanoid = character and character:FindFirstChild("Humanoid")
		if humanoid then
			humanoid.Health = humanoid.MaxHealth
		end
	end
}

TextChatService.OnIncomingMessage = function(message)
	local properties = Instance.new("TextChatMessageProperties")

	local sourceUserId = message.TextSource and message.TextSource.UserId
	local player = sourceUserId and Players:GetPlayerByUserId(sourceUserId)

	if player and message.Text:sub(1, #PREFIX) == PREFIX then
		local commandName = message.Text:sub(#PREFIX + 1):lower()
		local handler = commands[commandName]
		if handler then
			handler(player)
			properties.Text = "" -- hide the raw command from public chat
		end
	end

	return properties
end`,
          explain: 'OnIncomingMessage runs for every chat message sent in the game and lets you change how it displays (or hide it entirely by clearing Text) before other players see it. Always gate commands behind a real permission check in a production game — this example intentionally has no admin check, so anyone could trigger "heal" here.'
        }
      ]
    },
    {
      id: 'teleport-between-places',
      title: 'Teleporting players between places (TeleportService)',
      category: 'data',
      level: 'intermediate',
      desc: 'Send a player from a lobby place to a gameplay place within the same Roblox experience, optionally carrying custom data with them.',
      image: 'https://raw.githubusercontent.com/Roblox/luau/master/docs/logo.svg',
      imageAlt: 'Luau language logo (GitHub)',
      sourceLinks: [
        { label: 'Roblox Docs: TeleportService', url: 'https://create.roblox.com/docs/reference/engine/classes/TeleportService' }
      ],
      files: [
        {
          name: 'ServerScriptService/LobbyTeleporter.lua (Script)',
          lang: 'lua',
          code: `local TeleportService = game:GetService("TeleportService")

local GAMEPLAY_PLACE_ID = 0 -- replace with your real place ID

local function sendToGameplay(players)
	local options = Instance.new("TeleportOptions")
	options:SetTeleportData({ queuedAt = os.time() })

	local success, err = pcall(function()
		TeleportService:TeleportAsync(GAMEPLAY_PLACE_ID, players, options)
	end)

	if not success then
		warn("Teleport failed: " .. tostring(err))
	end
end

-- Example: teleport everyone currently in the lobby
sendToGameplay(game.Players:GetPlayers())`,
          explain: 'TeleportAsync accepts a list of players so an entire party can be teleported together into the same server instance, which matters for matchmaking — teleporting players one at a time can scatter them across different servers.'
        }
      ]
    },
    {
      id: 'oop-class-pattern',
      title: 'Object-oriented Luau (classes with metatables)',
      category: 'architecture',
      level: 'advanced',
      desc: 'How to build a reusable "class" in Luau using metatables — the pattern behind most enemy AI, inventory items, and UI component systems in larger games.',
      image: 'https://raw.githubusercontent.com/JohnnyMorganz/luau-lsp/main/img/icon.png',
      imageAlt: 'Luau tooling icon (GitHub)',
      sourceLinks: [
        { label: 'Roblox Docs: Luau scope', url: 'https://create.roblox.com/docs/luau/scope' },
        { label: 'Roblox Docs: ModuleScript', url: 'https://create.roblox.com/docs/reference/engine/classes/ModuleScript' }
      ],
      files: [
        {
          name: 'ReplicatedStorage/Modules/Enemy.lua (ModuleScript)',
          lang: 'lua',
          code: `local Enemy = {}
Enemy.__index = Enemy

function Enemy.new(name, health)
	local self = setmetatable({}, Enemy)
	self.name = name
	self.health = health
	self.maxHealth = health
	return self
end

function Enemy:takeDamage(amount)
	self.health = math.max(0, self.health - amount)
	if self.health == 0 then
		self:onDeath()
	end
end

function Enemy:onDeath()
	print(self.name .. " has been defeated")
end

return Enemy`,
          explain: '__index = Enemy is the key line — when Luau can\'t find a field directly on an instance (like a method call), it looks it up on the table assigned to __index instead. That\'s what lets every Enemy.new() object share the same takeDamage/onDeath functions without copying them individually.'
        },
        {
          name: 'ServerScriptService/SpawnEnemies.lua (Script)',
          lang: 'lua',
          code: `local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Enemy = require(ReplicatedStorage.Modules.Enemy)

local goblin = Enemy.new("Goblin", 50)
local dragon = Enemy.new("Dragon", 500)

goblin:takeDamage(60) -- defeats the goblin (health clamped at 0)
dragon:takeDamage(100) -- dragon survives with 400 health left`,
          explain: 'Each Enemy.new() call creates an independent table — goblin and dragon track separate health values even though they share the exact same method code, which is the whole point of the class pattern.'
        }
      ]
    },
    {
      id: 'coroutine-task-scheduling',
      title: 'Delayed and repeating tasks (task library)',
      category: 'architecture',
      level: 'intermediate',
      desc: 'The modern, correct way to delay code, repeat it on an interval, and cancel it later — replacing the older wait()/spawn() functions.',
      image: 'https://raw.githubusercontent.com/Roblox/luau/master/docs/logo.svg',
      imageAlt: 'Luau language logo (GitHub)',
      sourceLinks: [
        { label: 'Roblox Docs: task library', url: 'https://create.roblox.com/docs/reference/engine/libraries/task' }
      ],
      files: [
        {
          name: 'ServerScriptService/PeriodicReward.lua (Script)',
          lang: 'lua',
          code: `local Players = game:GetService("Players")

local function startPeriodicReward(player)
	local thread = task.spawn(function()
		while player.Parent do
			task.wait(60)
			local leaderstats = player:FindFirstChild("leaderstats")
			local coins = leaderstats and leaderstats:FindFirstChild("Coins")
			if coins then
				coins.Value += 5
			end
		end
	end)

	player.AncestryChanged:Connect(function()
		if not player.Parent then
			task.cancel(thread)
		end
	end)
end

Players.PlayerAdded:Connect(startPeriodicReward)`,
          explain: 'task.spawn/task.wait/task.cancel replaced the older spawn()/wait() functions because they run on a more predictable schedule and integrate properly with Roblox\'s task scheduler. Cancelling the thread when the player leaves (player.Parent becomes nil) prevents the loop from running forever in the background after they\'ve disconnected.'
        }
      ]
    },
    {
      id: 'string-table-utilities',
      title: 'String and table utilities every script needs',
      category: 'architecture',
      level: 'beginner',
      desc: 'Common Luau string and table operations — splitting text, trimming whitespace, and shallow-copying tables — gathered as small reusable functions.',
      image: 'https://raw.githubusercontent.com/github/explore/main/topics/lua/lua.png',
      imageAlt: 'Lua logo (GitHub topic image)',
      sourceLinks: [
        { label: 'Roblox Docs: string library', url: 'https://create.roblox.com/docs/reference/engine/libraries/string' },
        { label: 'Roblox Docs: table library', url: 'https://create.roblox.com/docs/reference/engine/libraries/table' }
      ],
      files: [
        {
          name: 'ReplicatedStorage/Modules/Utils.lua (ModuleScript)',
          lang: 'lua',
          code: `local Utils = {}

function Utils.split(text, separator)
	local parts = {}
	for part in text:gmatch("([^" .. separator .. "]+)") do
		table.insert(parts, part)
	end
	return parts
end

function Utils.trim(text)
	return text:match("^%s*(.-)%s*$")
end

function Utils.shallowCopy(original)
	local copy = {}
	for key, value in pairs(original) do
		copy[key] = value
	end
	return copy
end

return Utils`,
          explain: 'shallowCopy matters because Luau tables are reference types — writing newTable = original just gives you a second name for the same table, so editing newTable would also silently change original. shallowCopy actually creates an independent table at the top level (though nested tables inside it are still shared).'
        }
      ]
    },
    {
      id: 'camera-first-person-toggle',
      title: 'Custom camera control (first/third person toggle)',
      category: 'ui',
      level: 'advanced',
      desc: 'Override the default camera behavior to let a player switch between first-person and third-person view with a keypress.',
      image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=800&q=60',
      imageAlt: 'First-person camera view reference image',
      sourceLinks: [
        { label: 'Roblox Docs: Camera', url: 'https://create.roblox.com/docs/reference/engine/classes/Camera' },
        { label: 'Roblox Docs: UserInputService', url: 'https://create.roblox.com/docs/reference/engine/classes/UserInputService' }
      ],
      files: [
        {
          name: 'StarterPlayerScripts/CameraToggle.lua (LocalScript)',
          lang: 'lua',
          code: `local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer

local isFirstPerson = false

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end

	if input.KeyCode == Enum.KeyCode.V then
		isFirstPerson = not isFirstPerson

		if isFirstPerson then
			player.CameraMinZoomDistance = 0.5
			player.CameraMaxZoomDistance = 0.5
		else
			player.CameraMinZoomDistance = 0.5
			player.CameraMaxZoomDistance = 128
		end
	end
end)`,
          explain: 'Forcing CameraMinZoomDistance and CameraMaxZoomDistance to the same small value is what locks the camera into first-person — Roblox\'s default camera script handles the rest automatically, so you don\'t need to write your own camera positioning logic. The gameProcessed check skips this handler when the player is typing in a TextBox, so "V" doesn\'t toggle the camera while chatting.'
        }
      ]
    }
  ];

  const SCRIPT_CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'communication', label: 'Client-Server' },
    { id: 'data', label: 'Data & Services' },
    { id: 'ui', label: 'UI & animation' },
    { id: 'gameplay', label: 'Gameplay' },
    { id: 'architecture', label: 'Architecture' }
  ];
  let activeScriptCategory = 'all';
  let scriptSearchQuery = '';

  let state = {
    conversations: {},   // id -> { id, title, messages: [], pinned, model, createdAt, updatedAt, projectId }
    projects: {},        // id -> { id, name, instructions, color, createdAt }
    activeId: null,
    activeView: 'dashboard',
    settings: {
      language: 'en',
      theme: 'dark',
      autoTheme: false,
      accent: '#3b82f6',
      fontSize: 15,
      radius: 18,
      fontFamily: "'Plus Jakarta Sans', 'Inter', 'Segoe UI', sans-serif",
      bgUrl: '',
      bgOpacity: 0.92,
      compact: false,
      reduceMotion: false,
      showAvatars: true,
      customInstructions: '',
      nickname: '',
      tone: 'balanced',
      enterToSend: true,
      suggestFollowups: true,
      streamResponses: true,
      streamSpeed: 3,
      autoRename: true,
      confirmDelete: true,
      spellcheck: true,
      defaultModel: 'ocean-pro',
      temperature: 0.7,
      maxTokens: 0,
      defaultWebSearch: false,
      defaultThinking: false,
      endpoint: '/chat',
      apiKey: '',
      saveLocally: true,
      includeHistory: true,
      analytics: false,
      maskAttachments: false,
      autoDeleteDays: 0,
      sidebarCollapsed: false
    }
  };

  let pendingAttachments = []; // {type: 'image'|'file', name, dataUrl/text}
  let currentModel = 'ocean-pro';
  let webSearchActive = false;
  let thinkActive = false;
  let canvasActive = false;
  let isGenerating = false;
  let abortRequested = false;
  let recognition = null;
  let isRecording = false;

  // ---------------------------------------------------------------
  // INTERNATIONALIZATION (English / Vietnamese)
  // ---------------------------------------------------------------
  const I18N = {
    en: {
      newChat: 'New chat', searchChats: 'Search chats...', dashboard: 'Dashboard',
      robloxExamples: 'Roblox Lua Examples', projects: 'Projects', pinned: 'Pinned',
      history: 'History', clear: 'Clear', settings: 'Settings', localWorkspace: 'Local workspace',
      descFlash: 'Fast & lightweight', descPro: 'Balanced everyday model', descThinking: 'Extended reasoning mode',
      descCode: 'Tuned for engineering', newConversation: 'New conversation', shareChat: 'Share chat',
      exportChat: 'Export chat', toggleTheme: 'Toggle theme', notifications: 'Notifications', clearAll: 'Clear all',
      robloxExamplesDesc: 'A growing reference library of Roblox Studio & Luau patterns — written for scripts you own, running inside Roblox\'s own engine. Click a card for the full code and a walkthrough of how it works.',
      searchExamples: 'Search examples...', projectsDesc: 'Group related conversations together with their own instructions.',
      newProject: 'New project', attachFile: 'Attach file or image', messageInput: 'Message Ocean AI...',
      voiceInput: 'Voice input', sendMessage: 'Send message', webSearch: 'Web search', extendedThinking: 'Extended thinking',
      canvas: 'Canvas', disclaimer: 'Ocean AI can make mistakes. Verify important information.',
      tabAppearance: 'Appearance', tabBehavior: 'Behavior', tabModels: 'Models & API', tabPrivacy: 'Privacy',
      tabData: 'Data controls', tabShortcuts: 'Shortcuts', tabAbout: 'About',
      language: 'Language / Ngôn ngữ', theme: 'Theme', themeDark: 'Dark', themeLight: 'Light',
      themeCharcoal: 'Charcoal', themeMidnight: 'Midnight', matchSystemTheme: 'Match system theme',
      accentColor: 'Accent color', fontSize: 'Chat font size <span class="setting-value" id="fontSizeValue">{0}</span>',
      cornerRadius: 'Message corner radius <span class="setting-value" id="radiusValue">{0}</span>',
      fontFamily: 'Font family', systemDefault: 'System default', backgroundPreset: 'Background preset',
      noneSolid: 'None (solid color)', deepOcean: 'Deep ocean', nightSky: 'Night sky / stars',
      abstractGradient: 'Abstract gradient', mountains: 'Mountains', customUrl: 'Custom URL…',
      backgroundUrl: 'Background image URL', bgOpacity: 'Background overlay opacity <span class="setting-value" id="bgOpacityValue">{0}</span>',
      compactBubbles: 'Compact message bubbles', reduceMotion: 'Reduce motion / animations',
      showAvatars: 'Show avatars in chat', resetAppearance: 'Reset appearance to defaults',
      instructionsPreset: 'Custom instructions preset', writeOwn: 'None — write your own',
      presetShort: 'Short & direct', presetTeach: 'Teach me step-by-step', presetRoblox: 'Roblox scripting focus',
      customDots: 'Custom…', customInstructions: 'Custom instructions',
      customInstructionsPlaceholder: 'Tell Ocean AI how to respond — tone, format, expertise level...',
      nickname: 'Your nickname (used in greetings)', nicknamePlaceholder: 'What should Ocean AI call you?',
      responseTone: 'Response tone', toneBalanced: 'Balanced', toneConcise: 'Concise & direct',
      toneFriendly: 'Friendly & casual', toneFormal: 'Formal & professional', toneDetailed: 'Detailed & thorough',
      enterToSend: 'Send message with Enter', suggestFollowups: 'Suggest follow-up prompts',
      streamResponses: 'Stream responses', streamSpeed: 'Streaming speed <span class="setting-value" id="streamSpeedValue">{0}</span>',
      autoRename: 'Auto-rename chats from first message', confirmDelete: 'Confirm before deleting a chat',
      spellcheck: 'Spell-check input box', defaultModel: 'Default model', defaultModelFlash: 'Ocean Flash — fastest',
      defaultModelPro: 'Ocean Pro — balanced', defaultModelThinking: 'Ocean Thinking — deep reasoning',
      defaultModelCode: 'Ocean Code — engineering', temperature: 'Temperature <span class="setting-value" id="temperatureValue">{0}</span>',
      maxResponseLength: 'Max response length <span class="setting-value" id="maxTokensValue">{0}</span>',
      defaultWebSearchOn: 'Default: web search on', defaultThinkingOn: 'Default: extended thinking on',
      endpointPreset: 'Backend endpoint preset', endpointDefault: '/chat (default)', customPath: 'Custom path…',
      backendEndpoint: 'Backend endpoint', apiKey: 'API key <span class="setting-value">(sent as header, stored locally only)</span>',
      apiKeyNote: '(sent as header, stored locally only)', show: 'Show', testConnection: 'Test connection',
      saveLocally: 'Save conversations locally', includeHistory: 'Include chat history as context',
      allowAnalytics: 'Allow analytics (none collected by default)', maskAttachments: 'Mask attachments in exported files',
      autoDelete: 'Auto-delete conversations older than', never: 'Never', days7: '7 days', days30: '30 days', days90: '90 days',
      privacyNote: 'Everything you type stays in your browser\'s local storage unless your configured backend at the endpoint above sends it elsewhere. Ocean AI itself does not transmit your data to any third party.',
      exportAll: 'Export all conversations', downloadJson: 'Download JSON', downloadMd: 'Download Markdown (.zip-style bundle)',
      importConversations: 'Import conversations', dropJson: 'Drop a .json export here', orClickBrowse: 'or click to browse',
      importMode: 'Import mode', importMerge: 'Merge (add new, keep existing)', importReplace: 'Replace (overwrite everything)',
      cancel: 'Cancel', importConversationsBtn: 'Import conversations', importing: 'Importing…',
      clearAllConvos: 'Clear all conversations', deleteAllChats: 'Delete all chats', resetAllSettings: 'Reset all settings to default',
      resetSettingsBtn: 'Reset settings', storageUsed: 'Storage used',
      scSend: 'Send message', scNewLine: 'New line', scNewChat: 'New chat', scSearch: 'Search chats',
      scToggleSidebar: 'Toggle sidebar', scToggleTheme: 'Toggle theme', scOpenSettings: 'Open settings',
      scCloseDialog: 'Close dialog', scStopGenerating: 'Stop generating',
      aboutVersion: 'Apex Workspace · Version 2.2',
      aboutDesc: 'A local-first AI chat workspace. Conversations are stored in your browser\'s local storage. Connect any backend at the configured endpoint to power responses.',
      aboutTagline: 'I\'m Not A Things or Humans, I\'m Everything !',
      shareConversation: 'Share conversation', shareNote: 'Anyone with this link can view a copy of this conversation.',
      copy: 'Copy', exportMd: 'Export as Markdown', exportTxt: 'Export as Text',
      projectName: 'Project name', projectNamePlaceholder: 'e.g. Marketing copy, Side project API...',
      projectInstructions: 'Project instructions (applied to every chat inside)',
      projectInstructionsPlaceholder: 'e.g. Always respond in formal English and cite sources.',
      color: 'Color', createProject: 'Create project'
    },
    vi: {
      newChat: 'Cuộc trò chuyện mới', searchChats: 'Tìm kiếm cuộc trò chuyện...', dashboard: 'Bảng điều khiển',
      robloxExamples: 'Ví dụ Roblox Lua', projects: 'Dự án', pinned: 'Đã ghim',
      history: 'Lịch sử', clear: 'Xóa', settings: 'Cài đặt', localWorkspace: 'Không gian làm việc cục bộ',
      descFlash: 'Nhanh & nhẹ', descPro: 'Mô hình cân bằng hàng ngày', descThinking: 'Chế độ suy luận mở rộng',
      descCode: 'Tối ưu cho lập trình', newConversation: 'Cuộc trò chuyện mới', shareChat: 'Chia sẻ trò chuyện',
      exportChat: 'Xuất trò chuyện', toggleTheme: 'Chuyển giao diện', notifications: 'Thông báo', clearAll: 'Xóa tất cả',
      robloxExamplesDesc: 'Thư viện tham khảo ngày càng mở rộng về Roblox Studio & Luau — viết cho các script bạn sở hữu, chạy trong chính engine của Roblox. Nhấp vào thẻ để xem mã đầy đủ và giải thích cách hoạt động.',
      searchExamples: 'Tìm kiếm ví dụ...', projectsDesc: 'Nhóm các cuộc trò chuyện liên quan với hướng dẫn riêng.',
      newProject: 'Dự án mới', attachFile: 'Đính kèm tệp hoặc hình ảnh', messageInput: 'Nhắn tin cho Ocean AI...',
      voiceInput: 'Nhập bằng giọng nói', sendMessage: 'Gửi tin nhắn', webSearch: 'Tìm kiếm web', extendedThinking: 'Suy luận mở rộng',
      canvas: 'Canvas', disclaimer: 'Ocean AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.',
      tabAppearance: 'Giao diện', tabBehavior: 'Hành vi', tabModels: 'Mô hình & API', tabPrivacy: 'Quyền riêng tư',
      tabData: 'Quản lý dữ liệu', tabShortcuts: 'Phím tắt', tabAbout: 'Giới thiệu',
      language: 'Ngôn ngữ / Language', theme: 'Giao diện', themeDark: 'Tối', themeLight: 'Sáng',
      themeCharcoal: 'Than chì', themeMidnight: 'Nửa đêm', matchSystemTheme: 'Theo giao diện hệ thống',
      accentColor: 'Màu nhấn', fontSize: 'Cỡ chữ trò chuyện <span class="setting-value" id="fontSizeValue">{0}</span>',
      cornerRadius: 'Độ bo góc tin nhắn <span class="setting-value" id="radiusValue">{0}</span>',
      fontFamily: 'Phông chữ', systemDefault: 'Mặc định hệ thống', backgroundPreset: 'Hình nền có sẵn',
      noneSolid: 'Không có (màu đơn)', deepOcean: 'Đại dương sâu', nightSky: 'Bầu trời đêm / Sao',
      abstractGradient: 'Gradient trừu tượng', mountains: 'Núi non', customUrl: 'URL tùy chỉnh…',
      backgroundUrl: 'URL hình nền', bgOpacity: 'Độ mờ lớp phủ nền <span class="setting-value" id="bgOpacityValue">{0}</span>',
      compactBubbles: 'Bong bóng tin nhắn thu gọn', reduceMotion: 'Giảm chuyển động / hiệu ứng',
      showAvatars: 'Hiện ảnh đại diện trong trò chuyện', resetAppearance: 'Đặt lại giao diện về mặc định',
      instructionsPreset: 'Mẫu hướng dẫn tùy chỉnh', writeOwn: 'Không — tự viết',
      presetShort: 'Ngắn gọn & trực tiếp', presetTeach: 'Dạy tôi từng bước', presetRoblox: 'Tập trung lập trình Roblox',
      customDots: 'Tùy chỉnh…', customInstructions: 'Hướng dẫn tùy chỉnh',
      customInstructionsPlaceholder: 'Cho Ocean AI biết cách phản hồi — giọng điệu, định dạng, mức độ chuyên môn...',
      nickname: 'Biệt danh của bạn (dùng khi chào hỏi)', nicknamePlaceholder: 'Ocean AI nên gọi bạn là gì?',
      responseTone: 'Giọng điệu phản hồi', toneBalanced: 'Cân bằng', toneConcise: 'Ngắn gọn & trực tiếp',
      toneFriendly: 'Thân thiện & thoải mái', toneFormal: 'Trang trọng & chuyên nghiệp', toneDetailed: 'Chi tiết & kỹ lưỡng',
      enterToSend: 'Gửi tin nhắn bằng phím Enter', suggestFollowups: 'Gợi ý câu hỏi tiếp theo',
      streamResponses: 'Truyền phản hồi theo luồng', streamSpeed: 'Tốc độ truyền <span class="setting-value" id="streamSpeedValue">{0}</span>',
      autoRename: 'Tự động đặt tên trò chuyện từ tin nhắn đầu', confirmDelete: 'Xác nhận trước khi xóa trò chuyện',
      spellcheck: 'Kiểm tra chính tả ô nhập', defaultModel: 'Mô hình mặc định', defaultModelFlash: 'Ocean Flash — nhanh nhất',
      defaultModelPro: 'Ocean Pro — cân bằng', defaultModelThinking: 'Ocean Thinking — suy luận sâu',
      defaultModelCode: 'Ocean Code — lập trình', temperature: 'Độ sáng tạo (Temperature) <span class="setting-value" id="temperatureValue">{0}</span>',
      maxResponseLength: 'Độ dài phản hồi tối đa <span class="setting-value" id="maxTokensValue">{0}</span>',
      defaultWebSearchOn: 'Mặc định: bật tìm kiếm web', defaultThinkingOn: 'Mặc định: bật suy luận mở rộng',
      endpointPreset: 'Mẫu endpoint backend', endpointDefault: '/chat (mặc định)', customPath: 'Đường dẫn tùy chỉnh…',
      backendEndpoint: 'Endpoint backend', apiKey: 'API key <span class="setting-value">(gửi dưới dạng header, chỉ lưu cục bộ)</span>',
      apiKeyNote: '(gửi dưới dạng header, chỉ lưu cục bộ)', show: 'Hiện', testConnection: 'Kiểm tra kết nối',
      saveLocally: 'Lưu trò chuyện cục bộ', includeHistory: 'Đưa lịch sử trò chuyện vào ngữ cảnh',
      allowAnalytics: 'Cho phép phân tích (mặc định không thu thập)', maskAttachments: 'Ẩn tệp đính kèm khi xuất file',
      autoDelete: 'Tự động xóa trò chuyện cũ hơn', never: 'Không bao giờ', days7: '7 ngày', days30: '30 ngày', days90: '90 ngày',
      privacyNote: 'Mọi thứ bạn nhập đều được lưu trong bộ nhớ cục bộ của trình duyệt, trừ khi backend bạn cấu hình ở endpoint trên gửi đi nơi khác. Bản thân Ocean AI không truyền dữ liệu của bạn cho bên thứ ba.',
      exportAll: 'Xuất tất cả cuộc trò chuyện', downloadJson: 'Tải xuống JSON', downloadMd: 'Tải xuống Markdown (gói .zip)',
      importConversations: 'Nhập cuộc trò chuyện', dropJson: 'Thả tệp .json vào đây', orClickBrowse: 'hoặc nhấp để chọn tệp',
      importMode: 'Chế độ nhập', importMerge: 'Hợp nhất (thêm mới, giữ dữ liệu cũ)', importReplace: 'Thay thế (ghi đè tất cả)',
      cancel: 'Hủy', importConversationsBtn: 'Nhập cuộc trò chuyện', importing: 'Đang nhập…',
      clearAllConvos: 'Xóa tất cả cuộc trò chuyện', deleteAllChats: 'Xóa tất cả trò chuyện', resetAllSettings: 'Đặt lại tất cả cài đặt về mặc định',
      resetSettingsBtn: 'Đặt lại cài đặt', storageUsed: 'Dung lượng đã dùng',
      scSend: 'Gửi tin nhắn', scNewLine: 'Xuống dòng', scNewChat: 'Trò chuyện mới', scSearch: 'Tìm trò chuyện',
      scToggleSidebar: 'Ẩn/hiện thanh bên', scToggleTheme: 'Chuyển giao diện', scOpenSettings: 'Mở cài đặt',
      scCloseDialog: 'Đóng hộp thoại', scStopGenerating: 'Dừng tạo phản hồi',
      aboutVersion: 'Apex Workspace · Phiên bản 2.2',
      aboutDesc: 'Không gian làm việc AI cục bộ. Các cuộc trò chuyện được lưu trong bộ nhớ cục bộ của trình duyệt. Kết nối với bất kỳ backend nào tại endpoint đã cấu hình để cung cấp phản hồi.',
      aboutTagline: 'Tôi Không Phải Là Vật Hay Con Người, Tôi Là Tất Cả !',
      shareConversation: 'Chia sẻ cuộc trò chuyện', shareNote: 'Bất kỳ ai có liên kết này đều có thể xem bản sao của cuộc trò chuyện.',
      copy: 'Sao chép', exportMd: 'Xuất dạng Markdown', exportTxt: 'Xuất dạng Văn bản',
      projectName: 'Tên dự án', projectNamePlaceholder: 'VD: Nội dung marketing, API dự án phụ...',
      projectInstructions: 'Hướng dẫn dự án (áp dụng cho mọi trò chuyện bên trong)',
      projectInstructionsPlaceholder: 'VD: Luôn trả lời bằng tiếng Anh trang trọng và trích dẫn nguồn.',
      color: 'Màu sắc', createProject: 'Tạo dự án'
    }
  };

  let currentLanguage = 'en';

  function t(key) {
    const dict = I18N[currentLanguage] || I18N.en;
    return dict[key] || I18N.en[key] || key;
  }

  function applyLanguage(lang) {
    currentLanguage = I18N[lang] ? lang : 'en';
    document.documentElement.lang = currentLanguage;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      let value = t(key);
      // Support {0}-style placeholders for nodes that wrap a child setting-value span
      const valueSpan = el.querySelector('.setting-value');
      if (value.includes('{0}') && valueSpan) {
        value = value.replace('{0}', valueSpan.outerHTML);
        el.innerHTML = value;
      } else if (value.includes('<span')) {
        el.innerHTML = value;
      } else {
        el.textContent = value;
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
  }

  const MODEL_LABELS = {
    'ocean-flash': 'Ocean Flash',
    'ocean-pro': 'Ocean Pro',
    'ocean-thinking': 'Ocean Thinking',
    'ocean-code': 'Ocean Code'
  };

  const SUGGESTIONS = [
    { title: 'Explain a concept', sub: 'Break down quantum computing simply', prompt: 'Explain quantum computing like I\'m new to the topic.' },
    { title: 'Write something', sub: 'Draft a short blog post intro', prompt: 'Write an engaging intro paragraph for a blog post about productivity.' },
    { title: 'Debug code', sub: 'Find the issue in a function', prompt: 'Help me debug a piece of code that isn\'t working as expected.' },
    { title: 'Brainstorm ideas', sub: 'Plan a weekend project', prompt: 'Brainstorm five creative weekend project ideas for me.' }
  ];

  const FOLLOWUPS_BANK = [
    'Can you go deeper on that?',
    'Give me a concrete example',
    'Summarize this in 3 bullet points',
    'What are the tradeoffs here?'
  ];

  // ---------------------------------------------------------------
  // DOM REFS
  // ---------------------------------------------------------------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const chatBox = $('#chatBox');
  const userInput = $('#userInput');
  const sendBtn = $('#sendBtn');
  const sidebar = $('#sidebar');
  const historyList = $('#historyList');
  const pinnedList = $('#pinnedList');
  const chatTitle = $('#chatTitle');
  const toast = $('#toast');

  // ---------------------------------------------------------------
  // PERSISTENCE
  // ---------------------------------------------------------------
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state.conversations = parsed.conversations || {};
        state.activeId = parsed.activeId || null;
      }
    } catch (e) { console.warn('Failed to load conversations', e); }

    try {
      const rawProjects = localStorage.getItem(PROJECTS_KEY);
      if (rawProjects) state.projects = JSON.parse(rawProjects) || {};
    } catch (e) { console.warn('Failed to load projects', e); }

    try {
      const rawSettings = localStorage.getItem(SETTINGS_KEY);
      if (rawSettings) {
        state.settings = Object.assign(state.settings, JSON.parse(rawSettings));
      }
    } catch (e) { console.warn('Failed to load settings', e); }
  }

  function saveConversations() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        conversations: state.conversations,
        activeId: state.activeId
      }));
    } catch (e) { console.warn('Failed to save conversations', e); }
    updateStorageMeta();
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    } catch (e) { console.warn('Failed to save settings', e); }
  }

  function saveProjects() {
    try {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(state.projects));
    } catch (e) { console.warn('Failed to save projects', e); }
  }

  function updateStorageMeta() {
    const el = $('#storageMeta');
    const convoBytes = new Blob([localStorage.getItem(STORAGE_KEY) || '']).size;
    const settingsBytes = new Blob([localStorage.getItem(SETTINGS_KEY) || '']).size;
    const projectBytes = new Blob([localStorage.getItem(PROJECTS_KEY) || '']).size;
    const totalKb = ((convoBytes + settingsBytes + projectBytes) / 1024).toFixed(1);
    const count = Object.keys(state.conversations).length;
    const msgCount = Object.values(state.conversations).reduce((sum, c) => sum + c.messages.length, 0);
    if (el) el.textContent = `${count} conversation${count !== 1 ? 's' : ''} · ${msgCount} message${msgCount !== 1 ? 's' : ''} · ${totalKb} KB used`;

    const aboutStats = $('#aboutStats');
    if (aboutStats) {
      aboutStats.innerHTML = `
        <div class="stat"><div class="stat-num">${count}</div><div class="stat-label">Chats</div></div>
        <div class="stat"><div class="stat-num">${msgCount}</div><div class="stat-label">Messages</div></div>
        <div class="stat"><div class="stat-num">${Object.keys(state.projects).length}</div><div class="stat-label">Projects</div></div>`;
    }
  }

  // ---------------------------------------------------------------
  // UTIL
  // ---------------------------------------------------------------
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function showToast(msg, icon) {
    toast.innerHTML = (icon ? icon + ' ' : '') + escapeHtml(msg);
    toast.classList.add('visible');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('visible'), 2200);
  }

  // ---------------------------------------------------------------
  // NOTIFICATIONS (persisted log of real in-app events)
  // ---------------------------------------------------------------
  const NOTIF_KEY = 'oceanai_notifications_v1';
  let notifications = [];

  function loadNotifications() {
    try {
      const raw = localStorage.getItem(NOTIF_KEY);
      notifications = raw ? JSON.parse(raw) : [];
    } catch (e) { notifications = []; }
  }

  function saveNotifications() {
    try { localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications.slice(0, 50))); } catch (e) { /* noop */ }
  }

  const NOTIF_ICONS = {
    response: `<svg viewBox="0 0 24 24" width="15" height="15"><path d="M3 17c2-3 4-3 6 0s4 3 6 0 4-3 6 0" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
    project: `<svg viewBox="0 0 24 24" width="15" height="15"><path d="M3 7l2-3h6l1.5 2H21v11a1 1 0 01-1 1H4a1 1 0 01-1-1V7z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" width="15" height="15"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>`,
    import: `<svg viewBox="0 0 24 24" width="15" height="15"><path d="M12 16V4m0 0L7 9m5-5l5 5M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    error: `<svg viewBox="0 0 24 24" width="15" height="15"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M12 8v5M12 16v.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    info: `<svg viewBox="0 0 24 24" width="15" height="15"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M12 11v5M12 8v.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`
  };

  function pushNotification(type, title, desc) {
    notifications.unshift({ id: uid(), type, title, desc, ts: Date.now(), read: false });
    notifications = notifications.slice(0, 50);
    saveNotifications();
    renderNotifications();
  }

  function renderNotifications() {
    const list = $('#notifList');
    const badge = $('#notifBadge');
    if (!list) return;
    const unreadCount = notifications.filter(n => !n.read).length;
    if (unreadCount > 0) {
      badge.style.display = 'flex';
      badge.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
    } else {
      badge.style.display = 'none';
    }
    if (!notifications.length) {
      list.innerHTML = `<div class="notif-empty">No notifications yet</div>`;
      return;
    }
    list.innerHTML = notifications.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
        <div class="notif-icon">${NOTIF_ICONS[n.type] || NOTIF_ICONS.info}</div>
        <div class="notif-body">
          <div class="notif-title">${escapeHtml(n.title)}</div>
          ${n.desc ? `<div class="notif-desc">${escapeHtml(n.desc)}</div>` : ''}
          <div class="notif-time">${timeAgo(n.ts)}</div>
        </div>
      </div>`).join('');
  }

  function timeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
  }

  function dayBucket(ts) {
    const now = new Date(); const d = new Date(ts);
    const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return 'Previous 7 days';
    if (diffDays < 30) return 'Previous 30 days';
    return 'Older';
  }

  // ---------------------------------------------------------------
  // SIMPLE MARKDOWN RENDERER
  // ---------------------------------------------------------------
  function renderMarkdown(raw) {
    let text = raw;

    // Extract code blocks first to protect from other transforms
    const codeBlocks = [];
    text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (m, lang, code) => {
      const idx = codeBlocks.length;
      codeBlocks.push({ lang: lang || 'text', code: code.replace(/\n$/, '') });
      return `\x00CODEBLOCK${idx}\x00`;
    });

    // think blocks
    text = text.replace(/<think>([\s\S]*?)<\/think>/g, (m, inner) => {
      const id = 'think-' + uid();
      return `\x00THINKBLOCK\x00${escapeHtml(inner.trim())}\x00ENDTHINK\x00`;
    });

    // Escape remaining HTML
    text = escapeHtml(text);

    // Re-inject think blocks
    text = text.replace(/\x00THINKBLOCK\x00([\s\S]*?)\x00ENDTHINK\x00/g, (m, inner) => {
      return `\x00THINKHTML\x00${inner}\x00ENDTHINKHTML\x00`;
    });

    // Headings
    text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold / italic
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<b><i>$1</i></b>');
    text = text.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<i>$1</i>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Links
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Blockquotes
    text = text.replace(/^&gt; (.*$)/gim, '<blockquote>$1</blockquote>');

    // Tables (simple GFM)
    text = text.replace(/((?:^\|.*\|\s*\n)+)/gim, (block) => {
      const lines = block.trim().split('\n').filter(Boolean);
      if (lines.length < 2) return block;
      const headerCells = lines[0].split('|').map(c => c.trim()).filter((c, i, arr) => !(i === 0 && c === '') && !(i === arr.length - 1 && c === ''));
      const sepLine = lines[1];
      if (!/^[\s|:-]+$/.test(sepLine)) return block;
      let html = '<table><thead><tr>' + headerCells.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
      for (let i = 2; i < lines.length; i++) {
        const cells = lines[i].split('|').map(c => c.trim()).filter((c, idx, arr) => !(idx === 0 && c === '') && !(idx === arr.length - 1 && c === ''));
        html += '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
      }
      html += '</tbody></table>';
      return html;
    });

    // Lists
    text = text.replace(/^(?:-|\*) (.*)$/gim, '\x00UL\x00$1\x00ENDUL\x00');
    text = text.replace(/(\x00UL\x00.*\x00ENDUL\x00\n?)+/g, (m) => {
      const items = m.match(/\x00UL\x00(.*)\x00ENDUL\x00/g).map(i => i.replace(/\x00UL\x00|\x00ENDUL\x00/g, ''));
      return '<ul>' + items.map(i => `<li>${i}</li>`).join('') + '</ul>';
    });
    text = text.replace(/^\d+\. (.*)$/gim, '\x00OL\x00$1\x00ENDOL\x00');
    text = text.replace(/(\x00OL\x00.*\x00ENDOL\x00\n?)+/g, (m) => {
      const items = m.match(/\x00OL\x00(.*)\x00ENDOL\x00/g).map(i => i.replace(/\x00OL\x00|\x00ENDOL\x00/g, ''));
      return '<ol>' + items.map(i => `<li>${i}</li>`).join('') + '</ol>';
    });

    // Paragraphs: split on double newline
    text = text.split(/\n\n+/).map(block => {
      if (/^<(h1|h2|h3|ul|ol|table|blockquote)/.test(block.trim())) return block;
      if (block.includes('\x00CODEBLOCK')) return block;
      if (!block.trim()) return '';
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');

    // Re-inject code blocks with header + copy button
    text = text.replace(/\x00CODEBLOCK(\d+)\x00/g, (m, idx) => {
      const block = codeBlocks[parseInt(idx)];
      const codeId = 'code-' + uid();
      return `<div class="code-block-wrap">
        <div class="code-block-header">
          <span>${escapeHtml(block.lang)}</span>
          <button class="copy-code-btn" data-target="${codeId}">
            <svg viewBox="0 0 24 24" width="13" height="13"><rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M5 15V5a2 2 0 012-2h10" stroke="currentColor" stroke-width="1.7" fill="none"/></svg>
            Copy
          </button>
        </div>
        <pre><code id="${codeId}">${escapeHtml(block.code)}</code></pre>
      </div>`;
    });

    // Re-inject think blocks as collapsible
    text = text.replace(/\x00THINKHTML\x00([\s\S]*?)\x00ENDTHINKHTML\x00/g, (m, inner) => {
      return `<div class="think-block">
        <div class="think-header" onclick="this.parentElement.classList.toggle('collapsed')">
          <svg viewBox="0 0 24 24" width="13" height="13"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Thought process
        </div>
        <div class="think-body">${inner.replace(/\n/g, '<br>')}</div>
      </div>`;
    });

    return text;
  }

  // ---------------------------------------------------------------
  // CONVERSATION MANAGEMENT
  // ---------------------------------------------------------------
  function createConversation() {
    const id = uid();
    state.conversations[id] = {
      id, title: 'New conversation', messages: [], pinned: false,
      model: currentModel, createdAt: Date.now(), updatedAt: Date.now()
    };
    state.activeId = id;
    saveConversations();
    return id;
  }

  function getActiveConversation() {
    if (!state.activeId || !state.conversations[state.activeId]) return null;
    return state.conversations[state.activeId];
  }

  function deleteConversation(id) {
    delete state.conversations[id];
    if (state.activeId === id) {
      state.activeId = null;
    }
    saveConversations();
    renderHistory();
    if (!state.activeId) {
      renderChatEmpty();
      chatTitle.textContent = 'New conversation';
    }
  }

  function renameConversation(id, newTitle) {
    if (state.conversations[id]) {
      state.conversations[id].title = newTitle.trim() || 'Untitled chat';
      saveConversations();
      renderHistory();
      if (id === state.activeId) chatTitle.textContent = state.conversations[id].title;
    }
  }

  function togglePin(id) {
    if (state.conversations[id]) {
      state.conversations[id].pinned = !state.conversations[id].pinned;
      saveConversations();
      renderHistory();
    }
  }

  function switchConversation(id) {
    state.activeId = id;
    saveConversations();
    renderHistory();
    setActiveView('dashboard');
    renderActiveChat();
    if (window.innerWidth <= 880) collapseSidebar(true);
  }

  // ---------------------------------------------------------------
  // PROJECTS
  // ---------------------------------------------------------------
  function createProject(name, instructions, color) {
    const id = uid();
    state.projects[id] = { id, name: name.trim() || 'Untitled project', instructions: instructions.trim(), color, createdAt: Date.now() };
    saveProjects();
    renderProjects();
    return id;
  }

  function deleteProject(id) {
    delete state.projects[id];
    // unlink any conversations pointing at this project
    Object.values(state.conversations).forEach(c => { if (c.projectId === id) delete c.projectId; });
    saveProjects();
    saveConversations();
    renderProjects();
    renderHistory();
  }

  function renderProjects() {
    const grid = $('#projectGrid');
    if (!grid) return;
    const projects = Object.values(state.projects).sort((a, b) => b.createdAt - a.createdAt);
    if (!projects.length) {
      grid.innerHTML = `<div class="empty-state-mini" style="grid-column:1/-1;">No projects yet. Create one to group related chats with shared instructions.</div>`;
      return;
    }
    grid.innerHTML = projects.map(p => {
      const chatCount = Object.values(state.conversations).filter(c => c.projectId === p.id).length;
      return `<div class="project-card" data-id="${p.id}">
        <button class="hist-action-btn danger project-delete" data-id="${p.id}" title="Delete project">
          <svg viewBox="0 0 24 24" width="13" height="13"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/></svg>
        </button>
        <div class="p-name"><span class="project-color-dot" style="background:${p.color}"></span>${escapeHtml(p.name)}</div>
        <div class="p-meta">${chatCount} chat${chatCount !== 1 ? 's' : ''}${p.instructions ? ' · has instructions' : ''}</div>
      </div>`;
    }).join('');

    grid.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.project-delete')) return;
        const id = createConversation();
        state.conversations[id].projectId = card.dataset.id;
        state.conversations[id].title = `${state.projects[card.dataset.id].name} chat`;
        saveConversations();
        switchConversation(id);
      });
    });
    grid.querySelectorAll('.project-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete this project? Conversations inside will be kept but unlinked.')) deleteProject(btn.dataset.id);
      });
    });
  }

  // ---------------------------------------------------------------
  // VIEW SWITCHING (Dashboard / Explore / Projects)
  // ---------------------------------------------------------------
  function setActiveView(view) {
    state.activeView = view;
    $$('.nav-menu .nav-item').forEach(i => i.classList.toggle('active', i.dataset.view === view));
    $('#chatBox').style.display = view === 'dashboard' ? 'flex' : 'none';
    $('#exploreView').classList.toggle('active', view === 'explore');
    $('#projectsView').classList.toggle('active', view === 'projects');
    const inputWrapper = document.querySelector('.input-wrapper');
    inputWrapper.style.display = view === 'dashboard' ? 'flex' : 'none';
    if (view === 'explore') renderScriptLibrary();
    if (view === 'projects') renderProjects();
  }

  // ---------------------------------------------------------------
  // SCRIPTING EXAMPLES LIBRARY
  // ---------------------------------------------------------------
  function renderLibFilters() {
    const wrap = $('#libFilters');
    if (!wrap) return;
    wrap.innerHTML = SCRIPT_CATEGORIES.map(c =>
      `<button class="lib-filter-chip ${c.id === activeScriptCategory ? 'active' : ''}" data-cat="${c.id}">${escapeHtml(c.label)}</button>`
    ).join('');
    wrap.querySelectorAll('.lib-filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        activeScriptCategory = btn.dataset.cat;
        renderLibFilters();
        renderScriptLibrary();
      });
    });
  }

  function renderScriptLibrary() {
    const grid = $('#modelGrid');
    if (!grid) return;
    renderLibFilters();

    const q = scriptSearchQuery.toLowerCase().trim();
    const filtered = SCRIPT_LIBRARY.filter(s => {
      const matchesCat = activeScriptCategory === 'all' || s.category === activeScriptCategory;
      const matchesQuery = !q || s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });

    if (!filtered.length) {
      grid.innerHTML = `<div class="empty-state-mini" style="grid-column:1/-1;">No examples match that search.</div>`;
      return;
    }

    grid.innerHTML = filtered.map(s => {
      const imgHtml = s.image
        ? `<img class="example-card-img" src="${escapeHtml(s.image)}" alt="${escapeHtml(s.imageAlt || s.title)}" loading="lazy" onerror="this.outerHTML='<div class=&quot;example-card-img-fallback&quot;><svg viewBox=&quot;0 0 24 24&quot; width=&quot;26&quot; height=&quot;26&quot;><path d=&quot;M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z&quot; stroke=&quot;currentColor&quot; stroke-width=&quot;1.5&quot; fill=&quot;none&quot;/></svg></div>'">`
        : `<div class="example-card-img-fallback"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" stroke-width="1.5" fill="none"/></svg></div>`;

      return `<div class="model-card example-card" data-id="${s.id}">
        ${imgHtml}
        <div class="example-card-body">
          <div class="example-card-top">
            <span class="ec-title">${escapeHtml(s.title)}</span>
            <span class="ec-level ${s.level}">${escapeHtml(s.level)}</span>
          </div>
          <div class="ec-desc">${escapeHtml(s.desc)}</div>
          <div class="ec-tags">
            <span class="model-card-tag">${s.files.length} file${s.files.length !== 1 ? 's' : ''}</span>
            <span class="model-card-tag">${escapeHtml(SCRIPT_CATEGORIES.find(c => c.id === s.category)?.label || s.category)}</span>
          </div>
        </div>
      </div>`;
    }).join('');

    grid.querySelectorAll('.example-card').forEach(card => {
      card.addEventListener('click', () => openScriptDetail(card.dataset.id));
    });
  }

  $('#libSearchInput')?.addEventListener('input', (e) => {
    scriptSearchQuery = e.target.value;
    renderScriptLibrary();
  });

  function openScriptDetail(id) {
    const example = SCRIPT_LIBRARY.find(s => s.id === id);
    if (!example) return;

    $('#scriptDetailTitle').textContent = example.title;

    const imgHtml = example.image
      ? `<img class="script-detail-img" src="${escapeHtml(example.image)}" alt="${escapeHtml(example.imageAlt || example.title)}" onerror="this.remove()">`
      : '';

    const linksHtml = example.sourceLinks?.length
      ? `<div class="script-source-links">${example.sourceLinks.map(l => `<a class="source-link-chip" href="${escapeHtml(l.url)}" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" width="11" height="11"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>${escapeHtml(l.label)}</a>`).join('')}</div>`
      : '';

    const filesHtml = example.files.map(f => {
      const codeId = 'lib-code-' + uid();
      const explainHtml = f.explain
        ? `<div class="code-explain"><svg viewBox="0 0 24 24" width="13" height="13"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M12 11v5M12 8v.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><span>${escapeHtml(f.explain)}</span></div>`
        : '';
      return `<div style="margin-bottom:14px;">
        <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px;">${escapeHtml(f.name)}</div>
        <div class="code-block-wrap">
          <div class="code-block-header">
            <span>${escapeHtml(f.lang)}</span>
            <button class="copy-code-btn" data-target="${codeId}">
              <svg viewBox="0 0 24 24" width="13" height="13"><rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M5 15V5a2 2 0 012-2h10" stroke="currentColor" stroke-width="1.7" fill="none"/></svg>
              Copy
            </button>
          </div>
          <pre><code id="${codeId}">${escapeHtml(f.code)}</code></pre>
        </div>
        ${explainHtml}
      </div>`;
    }).join('');

    $('#scriptDetailBody').innerHTML = `
      ${imgHtml}
      <div class="script-detail-meta">
        <span class="ec-level ${example.level}">${escapeHtml(example.level)}</span>
        <span class="model-card-tag">${escapeHtml(SCRIPT_CATEGORIES.find(c => c.id === example.category)?.label || example.category)}</span>
      </div>
      <div class="script-detail-desc">${escapeHtml(example.desc)}</div>
      ${linksHtml}
      ${filesHtml}
    `;

    $('#scriptDetailModal').classList.add('open');
  }

  $('#closeScriptDetailBtn').addEventListener('click', () => $('#scriptDetailModal').classList.remove('open'));
  $('#scriptDetailModal').addEventListener('click', (e) => { if (e.target.id === 'scriptDetailModal') $('#scriptDetailModal').classList.remove('open'); });
  function renderHistory(filterText) {
    const convos = Object.values(state.conversations).sort((a, b) => b.updatedAt - a.updatedAt);
    const filter = (filterText || '').toLowerCase().trim();

    const pinned = convos.filter(c => c.pinned && (!filter || c.title.toLowerCase().includes(filter)));
    const rest = convos.filter(c => !c.pinned && (!filter || c.title.toLowerCase().includes(filter)));

    pinnedList.innerHTML = pinned.map(c => historyItemHtml(c)).join('');
    pinnedList.style.display = pinned.length ? 'flex' : 'none';
    pinnedList.previousElementSibling.style.display = pinned.length ? 'flex' : 'none';

    // group rest by day bucket
    const groups = {};
    rest.forEach(c => {
      const b = dayBucket(c.updatedAt);
      groups[b] = groups[b] || [];
      groups[b].push(c);
    });
    const order = ['Today', 'Yesterday', 'Previous 7 days', 'Previous 30 days', 'Older'];
    let html = '';
    order.forEach(b => {
      if (groups[b] && groups[b].length) {
        html += `<div class="history-group-label">${b}</div>`;
        html += groups[b].map(c => historyItemHtml(c)).join('');
      }
    });
    if (!rest.length && !pinned.length) {
      html = `<div style="padding:20px 8px;text-align:center;color:var(--text-tertiary);font-size:12.5px;">${filter ? 'No matching chats' : 'No conversations yet'}</div>`;
    }
    historyList.innerHTML = html;

    bindHistoryEvents();
  }

  function historyItemHtml(c) {
    const active = c.id === state.activeId ? 'active' : '';
    return `<div class="history-item ${active}" data-id="${c.id}">
      <svg class="hist-icon" viewBox="0 0 24 24" width="14" height="14"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/></svg>
      <span class="hist-title">${escapeHtml(c.title)}</span>
      <div class="hist-actions">
        <button class="hist-action-btn" data-action="pin" title="${c.pinned ? 'Unpin' : 'Pin'}">
          <svg viewBox="0 0 24 24" width="13" height="13"><path d="M12 2l1.5 5.5L19 9l-4 3.5L16 18l-4-3-4 3 1-5.5L5 9l5.5-1.5L12 2z" stroke="currentColor" stroke-width="1.5" fill="${c.pinned ? 'currentColor' : 'none'}" stroke-linejoin="round"/></svg>
        </button>
        <button class="hist-action-btn" data-action="rename" title="Rename">
          <svg viewBox="0 0 24 24" width="13" height="13"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/></svg>
        </button>
        <button class="hist-action-btn danger" data-action="delete" title="Delete">
          <svg viewBox="0 0 24 24" width="13" height="13"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/></svg>
        </button>
      </div>
    </div>`;
  }

  function bindHistoryEvents() {
    $$('.history-item').forEach(item => {
      const id = item.dataset.id;
      item.addEventListener('click', (e) => {
        if (e.target.closest('.hist-action-btn') || e.target.closest('.rename-input')) return;
        switchConversation(id);
      });
      item.querySelectorAll('.hist-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          if (action === 'pin') togglePin(id);
          if (action === 'delete') {
            if (!state.settings.confirmDelete || confirm('Delete this conversation? This cannot be undone.')) deleteConversation(id);
          }
          if (action === 'rename') startRename(item, id);
        });
      });
    });
  }

  function startRename(item, id) {
    const titleSpan = item.querySelector('.hist-title');
    const current = state.conversations[id].title;
    const input = document.createElement('input');
    input.type = 'text'; input.className = 'rename-input'; input.value = current;
    titleSpan.replaceWith(input);
    input.focus(); input.select();
    const commit = () => { renameConversation(id, input.value); };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { renderHistory(); }
    });
    input.addEventListener('blur', commit);
  }

  // ---------------------------------------------------------------
  // RENDER: CHAT AREA
  // ---------------------------------------------------------------
  function renderChatEmpty() {
    const shuffled = [...SUGGESTIONS];
    chatBox.innerHTML = `
      <div class="welcome-screen">
        <div class="welcome-logo">
          <svg viewBox="0 0 24 24" width="26" height="26"><path d="M3 17c2-3 4-3 6 0s4 3 6 0 4-3 6 0M3 11c2-3 4-3 6 0s4 3 6 0 4-3 6 0" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
        </div>
        <div class="welcome-title">How can I help you today?</div>
        <div class="welcome-sub">Ask anything — code, writing, analysis, brainstorming, or just a conversation. I can search the web, read files and images, and reason step by step.</div>
        <div class="suggestion-grid">
          ${shuffled.map(s => `<div class="suggestion-card" data-prompt="${escapeHtml(s.prompt)}">
            <div class="s-title">${escapeHtml(s.title)}</div>
            <div class="s-sub">${escapeHtml(s.sub)}</div>
          </div>`).join('')}
        </div>
      </div>`;
    $$('.suggestion-card').forEach(card => {
      card.addEventListener('click', () => {
        userInput.value = card.dataset.prompt;
        autoGrow();
        userInput.focus();
      });
    });
  }

  function renderActiveChat() {
    const convo = getActiveConversation();
    if (!convo || convo.messages.length === 0) {
      renderChatEmpty();
      chatTitle.textContent = convo ? convo.title : 'New conversation';
      return;
    }
    chatTitle.textContent = convo.title;
    chatBox.innerHTML = '';
    let lastBucket = null;
    convo.messages.forEach((msg, idx) => {
      const bucket = dayBucket(msg.ts || Date.now());
      if (bucket !== lastBucket) {
        const divider = document.createElement('div');
        divider.className = 'chat-date-divider';
        divider.textContent = bucket;
        chatBox.appendChild(divider);
        lastBucket = bucket;
      }
      appendMessageToDOM(msg, idx, false);
    });
    scrollToBottom(true);
  }

  function buildAttachmentsHtml(attachments) {
    if (!attachments || !attachments.length) return '';
    return attachments.map(a => {
      if (a.type === 'image') {
        return `<img class="attached-image-bubble" src="${a.dataUrl}" alt="${escapeHtml(a.name)}">`;
      }
      return `<div class="attached-file-chip">
        <svg viewBox="0 0 24 24" width="15" height="15"><path d="M14 3v4a1 1 0 001 1h4M6 2h8l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/></svg>
        <span>${escapeHtml(a.name)}</span>
      </div>`;
    }).join('');
  }

  function appendMessageToDOM(msg, idx, animate = true) {
    const row = document.createElement('div');
    row.className = `message-row ${msg.role === 'user' ? 'user-row' : 'bot-row'}`;
    row.dataset.idx = idx;
    if (!animate) row.style.opacity = '1';

    const avatar = msg.role === 'user'
      ? `<div class="msg-avatar user">U</div>`
      : `<div class="msg-avatar bot"><svg viewBox="0 0 24 24" width="15" height="15"><path d="M3 17c2-3 4-3 6 0s4 3 6 0 4-3 6 0" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg></div>`;

    const bubbleClass = `message ${msg.role === 'user' ? 'msg-user' : 'msg-bot'} ${state.settings.compact ? 'compact' : ''}`;
    const attachHtml = buildAttachmentsHtml(msg.attachments);
    const bodyHtml = msg.role === 'user'
      ? escapeHtml(msg.content).replace(/\n/g, '<br>')
      : renderMarkdown(msg.content);
    const sourcesHtml = msg.sources && msg.sources.length ? `<div class="web-sources">${msg.sources.map(s => `<a class="web-source-chip" href="${s.url}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="11" height="11"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>${escapeHtml(s.title)}</a>`).join('')}</div>` : '';

    const actionsHtml = msg.role === 'user'
      ? `<div class="message-actions">
          <button class="msg-action-btn" data-action="edit" title="Edit"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/></svg></button>
          <button class="msg-action-btn" data-action="copy" title="Copy"><svg viewBox="0 0 24 24" width="14" height="14"><rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M5 15V5a2 2 0 012-2h10" stroke="currentColor" stroke-width="1.7" fill="none"/></svg></button>
        </div>`
      : `<div class="message-actions">
          <button class="msg-action-btn" data-action="copy" title="Copy"><svg viewBox="0 0 24 24" width="14" height="14"><rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M5 15V5a2 2 0 012-2h10" stroke="currentColor" stroke-width="1.7" fill="none"/></svg></button>
          <button class="msg-action-btn" data-action="regenerate" title="Regenerate"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M21 12a9 9 0 11-2.6-6.4M21 4v5h-5" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <button class="msg-action-btn" data-action="like" title="Good response"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M7 11v9H4a1 1 0 01-1-1v-7a1 1 0 011-1h3zm0 0l4-7a2 2 0 013 2l-1 4h5.5a1.5 1.5 0 011.4 2l-2 6a2 2 0 01-1.9 1.3H7" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/></svg></button>
          <button class="msg-action-btn" data-action="dislike" title="Poor response"><svg viewBox="0 0 24 24" width="14" height="14" style="transform:scaleY(-1)"><path d="M7 11v9H4a1 1 0 01-1-1v-7a1 1 0 011-1h3zm0 0l4-7a2 2 0 013 2l-1 4h5.5a1.5 1.5 0 011.4 2l-2 6a2 2 0 01-1.9 1.3H7" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/></svg></button>
        </div>`;

    const metaHtml = msg.role === 'assistant'
      ? `<div class="msg-meta-row"><span class="model-tag">${escapeHtml(MODEL_LABELS[msg.model] || 'Ocean AI')}</span><span>${timeAgo(msg.ts || Date.now())}</span></div>`
      : '';

    row.innerHTML = `
      ${avatar}
      <div class="message-col">
        <div class="${bubbleClass}">${attachHtml}${bodyHtml}${sourcesHtml}</div>
        ${metaHtml}
        ${actionsHtml}
      </div>`;

    chatBox.appendChild(row);
    bindMessageActions(row, msg, idx);
    return row;
  }

  function bindMessageActions(row, msg, idx) {
    row.querySelectorAll('.msg-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'copy') {
          navigator.clipboard.writeText(msg.content).then(() => showToast('Copied to clipboard'));
        } else if (action === 'edit') {
          startEditMessage(row, msg, idx);
        } else if (action === 'regenerate') {
          regenerateResponse(idx);
        } else if (action === 'like') {
          btn.classList.toggle('liked');
          row.querySelector('[data-action="dislike"]').classList.remove('disliked');
          showToast('Thanks for the feedback');
        } else if (action === 'dislike') {
          btn.classList.toggle('disliked');
          row.querySelector('[data-action="like"]').classList.remove('liked');
          showToast('Thanks for the feedback');
        }
      });
    });
  }

  function startEditMessage(row, msg, idx) {
    const col = row.querySelector('.message-col');
    const bubble = row.querySelector('.message');
    const original = bubble.outerHTML;
    const actions = row.querySelector('.message-actions');
    actions.style.display = 'none';

    const editWrap = document.createElement('div');
    editWrap.innerHTML = `
      <textarea class="edit-textarea">${escapeHtml(msg.content)}</textarea>
      <div class="edit-actions">
        <button class="edit-cancel">Cancel</button>
        <button class="edit-save">Save &amp; submit</button>
      </div>`;
    bubble.replaceWith(editWrap);
    const textarea = editWrap.querySelector('textarea');
    textarea.focus();
    textarea.style.height = textarea.scrollHeight + 'px';

    editWrap.querySelector('.edit-cancel').addEventListener('click', () => {
      editWrap.replaceWith(bubble);
      actions.style.display = '';
    });
    editWrap.querySelector('.edit-save').addEventListener('click', () => {
      const newText = textarea.value.trim();
      if (!newText) return;
      const convo = getActiveConversation();
      convo.messages = convo.messages.slice(0, idx);
      convo.messages.push({ role: 'user', content: newText, ts: Date.now(), attachments: msg.attachments || [] });
      convo.updatedAt = Date.now();
      saveConversations();
      renderActiveChat();
      generateResponse(convo);
    });
  }

  function regenerateResponse(idx) {
    const convo = getActiveConversation();
    if (!convo) return;
    // remove this assistant message and everything after, then regenerate
    convo.messages = convo.messages.slice(0, idx);
    saveConversations();
    renderActiveChat();
    generateResponse(convo);
  }

  // ---------------------------------------------------------------
  // SCROLL HANDLING
  // ---------------------------------------------------------------
  function scrollToBottom(force) {
    const threshold = 120;
    const atBottom = chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < threshold;
    if (force || atBottom) {
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  }

  chatBox.addEventListener('scroll', () => {
    const distFromBottom = chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight;
    $('#scrollBottomBtn').classList.toggle('visible', distFromBottom > 200);
  });
  $('#scrollBottomBtn').addEventListener('click', () => scrollToBottom(true));

  // ---------------------------------------------------------------
  // SEND / RECEIVE MESSAGES
  // ---------------------------------------------------------------
  function autoGrow() {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 200) + 'px';
  }
  userInput.addEventListener('input', () => {
    autoGrow();
    $('#charCounter').textContent = userInput.value.length;
  });
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && state.settings.enterToSend) {
      e.preventDefault();
      handleSend();
    }
  });

  function handleAttachFiles(files) {
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          pendingAttachments.push({ type: 'image', name: file.name, dataUrl: e.target.result, size: file.size });
          renderAttachPreviews();
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          pendingAttachments.push({ type: 'file', name: file.name, text: (e.target.result || '').toString(), size: file.size });
          renderAttachPreviews();
        };
        if (file.type === 'text/plain' || file.name.match(/\.(txt|md|csv|json|js|py|html|css|xml|yaml|yml|log)$/i)) {
          reader.readAsText(file);
        } else {
          pendingAttachments.push({ type: 'file', name: file.name, text: '', size: file.size });
          renderAttachPreviews();
        }
      }
    });
  }

  function formatBytes(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function renderAttachPreviews() {
    const area = $('#attachPreviewArea');
    area.innerHTML = pendingAttachments.map((a, i) => {
      if (a.type === 'image') {
        return `<div class="attach-item"><img class="attach-img-thumb" src="${a.dataUrl}"><button class="attach-remove" data-i="${i}">×</button></div>`;
      }
      return `<div class="attach-item"><div class="attach-file-thumb">
        <svg viewBox="0 0 24 24" width="14" height="14"><path d="M14 3v4a1 1 0 001 1h4M6 2h8l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/></svg>
        <span class="file-name">${escapeHtml(a.name)}</span><span class="file-size">${formatBytes(a.size)}</span></div><button class="attach-remove" data-i="${i}">×</button></div>`;
    }).join('');
    area.querySelectorAll('.attach-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        pendingAttachments.splice(parseInt(btn.dataset.i), 1);
        renderAttachPreviews();
      });
    });
  }

  function handleSend() {
    if (isGenerating) { stopGeneration(); return; }
    const text = userInput.value.trim();
    if (!text && pendingAttachments.length === 0) return;

    let convo = getActiveConversation();
    if (!convo) {
      const id = createConversation();
      convo = state.conversations[id];
    }
    if (convo.messages.length === 0 && state.settings.autoRename) {
      convo.title = text ? (text.length > 48 ? text.slice(0, 48) + '…' : text) : 'New conversation';
    }

    const userMsg = { role: 'user', content: text, ts: Date.now(), attachments: pendingAttachments.slice() };
    convo.messages.push(userMsg);
    convo.updatedAt = Date.now();
    saveConversations();
    renderHistory();
    chatTitle.textContent = convo.title;

    // clear welcome screen if present
    if ($('.welcome-screen')) chatBox.innerHTML = '';
    appendMessageToDOM(userMsg, convo.messages.length - 1);
    scrollToBottom(true);

    userInput.value = '';
    autoGrow();
    $('#charCounter').textContent = '0';
    pendingAttachments = [];
    renderAttachPreviews();

    generateResponse(convo);
  }

  sendBtn.addEventListener('click', handleSend);

  function stopGeneration() {
    abortRequested = true;
    isGenerating = false;
    updateSendButton();
  }

  function updateSendButton() {
    sendBtn.classList.toggle('stop-mode', isGenerating);
    sendBtn.innerHTML = isGenerating
      ? `<svg viewBox="0 0 24 24" width="14" height="14"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>`
      : `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  async function generateResponse(convo) {
    isGenerating = true;
    abortRequested = false;
    updateSendButton();

    const typingId = 'typing-' + uid();
    const typingRow = document.createElement('div');
    typingRow.className = 'message-row bot-row';
    typingRow.id = typingId;
    typingRow.innerHTML = `
      <div class="msg-avatar bot"><svg viewBox="0 0 24 24" width="15" height="15"><path d="M3 17c2-3 4-3 6 0s4 3 6 0 4-3 6 0" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg></div>
      <div class="message-col">
        <div class="message msg-bot"><div class="typing-indicator"><span></span><span></span><span></span></div></div>
      </div>`;
    chatBox.appendChild(typingRow);
    scrollToBottom(true);

    const lastUserMsg = [...convo.messages].reverse().find(m => m.role === 'user');
    const imageAttachment = (lastUserMsg && lastUserMsg.attachments || []).find(a => a.type === 'image');
    const project = convo.projectId ? state.projects[convo.projectId] : null;

    const combinedInstructions = [
      state.settings.customInstructions,
      project ? `Project instructions: ${project.instructions}` : '',
      state.settings.nickname ? `Address the user as "${state.settings.nickname}" when natural.` : '',
      state.settings.tone && state.settings.tone !== 'balanced' ? `Preferred tone: ${state.settings.tone}.` : ''
    ].filter(Boolean).join('\n');

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (state.settings.apiKey) headers['Authorization'] = `Bearer ${state.settings.apiKey}`;

      const response = await fetch(state.settings.endpoint || '/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: lastUserMsg ? lastUserMsg.content : '',
          mode: currentModel,
          model: currentModel,
          web_search: webSearchActive,
          extended_thinking: thinkActive,
          custom_instructions: combinedInstructions,
          temperature: state.settings.temperature,
          max_tokens: state.settings.maxTokens || null,
          history: state.settings.includeHistory
            ? convo.messages.slice(0, -1).map(m => ({ role: m.role, content: m.content }))
            : [],
          image: imageAttachment ? imageAttachment.dataUrl : null
        })
      });

      if (!response.ok) throw new Error('Bad response: ' + response.status);
      const data = await response.json();
      document.getElementById(typingId)?.remove();
      if (abortRequested) { isGenerating = false; updateSendButton(); return; }

      const replyText = data.response || data.reply || data.message || '(empty response)';
      const sources = data.sources || (webSearchActive ? [] : undefined);

      const botMsg = { role: 'assistant', content: replyText, ts: Date.now(), model: currentModel, sources };
      convo.messages.push(botMsg);
      convo.updatedAt = Date.now();
      saveConversations();
      renderHistory();

      if (state.settings.streamResponses) {
        await streamMessage(botMsg, convo.messages.length - 1);
      } else {
        appendMessageToDOM(botMsg, convo.messages.length - 1);
      }

      if (state.settings.suggestFollowups) renderQuickSuggestions();

      if (document.hidden) {
        pushNotification('response', `${MODEL_LABELS[currentModel]} replied`, convo.title);
      }

    } catch (error) {
      document.getElementById(typingId)?.remove();
      const errMsg = { role: 'assistant', content: '⚠️ Could not reach the AI backend at `/chat`. Make sure your server is running and connected.', ts: Date.now(), model: currentModel };
      convo.messages.push(errMsg);
      saveConversations();
      appendMessageToDOM(errMsg, convo.messages.length - 1);
      pushNotification('error', 'Could not reach the backend', `Request to ${state.settings.endpoint || '/chat'} failed.`);
    }

    isGenerating = false;
    updateSendButton();
    scrollToBottom();
  }

  function streamMessage(msg, idx) {
    return new Promise((resolve) => {
      const row = document.createElement('div');
      row.className = 'message-row bot-row';
      row.dataset.idx = idx;
      const avatar = `<div class="msg-avatar bot"><svg viewBox="0 0 24 24" width="15" height="15"><path d="M3 17c2-3 4-3 6 0s4 3 6 0 4-3 6 0" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg></div>`;
      row.innerHTML = `${avatar}<div class="message-col"><div class="message msg-bot ${state.settings.compact ? 'compact' : ''}"><span class="stream-target"></span><span class="stream-cursor"></span></div></div>`;
      chatBox.appendChild(row);
      const target = row.querySelector('.stream-target');
      const cursor = row.querySelector('.stream-cursor');

      const full = msg.content;
      const chunkSize = Math.max(2, Math.round(full.length / 140));
      let i = 0;

      function tick() {
        if (abortRequested) { finish(); return; }
        i += chunkSize;
        const partial = full.slice(0, i);
        target.innerHTML = renderMarkdown(partial);
        scrollToBottom();
        if (i < full.length) {
          requestAnimationFrame(() => setTimeout(tick, 8));
        } else {
          finish();
        }
      }
      function finish() {
        cursor.remove();
        row.remove();
        appendMessageToDOM(msg, idx);
        scrollToBottom();
        resolve();
      }
      tick();
    });
  }

  function renderQuickSuggestions() {
    const row = $('#quickSuggestRow');
    const picks = [...FOLLOWUPS_BANK].sort(() => Math.random() - 0.5).slice(0, 3);
    row.innerHTML = picks.map(p => `<button class="quick-chip">${escapeHtml(p)}</button>`).join('');
    row.querySelectorAll('.quick-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        userInput.value = btn.textContent;
        autoGrow();
        handleSend();
        row.innerHTML = '';
      });
    });
  }

  // ---------------------------------------------------------------
  // MODEL SELECTOR
  // ---------------------------------------------------------------
  const modelTrigger = $('#modelTrigger');
  const modelDropdown = $('#modelDropdown');
  modelTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    modelDropdown.classList.toggle('open');
  });
  document.addEventListener('click', () => modelDropdown.classList.remove('open'));
  $$('.model-option').forEach(opt => {
    opt.addEventListener('click', () => {
      currentModel = opt.dataset.model;
      $$('.model-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      $('#modelTriggerLabel').textContent = MODEL_LABELS[currentModel];
      const dot = modelTrigger.querySelector('.model-dot');
      dot.className = 'model-dot ' + (opt.querySelector('.model-dot').classList[1] || '');
      modelDropdown.classList.remove('open');
    });
  });

  // ---------------------------------------------------------------
  // NOTIFICATION BELL
  // ---------------------------------------------------------------
  const notifBtn = $('#notifBtn');
  const notifDropdown = $('#notifDropdown');
  notifBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const opening = !notifDropdown.classList.contains('open');
    notifDropdown.classList.toggle('open');
    if (opening && notifications.some(n => !n.read)) {
      notifications.forEach(n => n.read = true);
      saveNotifications();
      renderNotifications();
    }
  });
  document.addEventListener('click', () => notifDropdown.classList.remove('open'));
  notifDropdown.addEventListener('click', (e) => e.stopPropagation());
  $('#clearNotifsBtn').addEventListener('click', () => {
    notifications = [];
    saveNotifications();
    renderNotifications();
  });

  // ---------------------------------------------------------------
  // TOOLBAR TOGGLES
  // ---------------------------------------------------------------
  function wireToggle(id, onChange) {
    const btn = $(id);
    btn.addEventListener('click', () => {
      const active = btn.dataset.active === 'true';
      btn.dataset.active = (!active).toString();
      onChange(!active);
    });
  }
  wireToggle('#webSearchToggle', (v) => { webSearchActive = v; showToast(v ? 'Web search enabled' : 'Web search disabled', v ? '🌐' : ''); });
  wireToggle('#thinkToggle', (v) => { thinkActive = v; showToast(v ? 'Extended thinking enabled' : 'Extended thinking disabled', v ? '🧠' : ''); });
  wireToggle('#canvasToggle', (v) => { canvasActive = v; showToast(v ? 'Canvas mode enabled' : 'Canvas mode disabled', v ? '🖼️' : ''); });

  // ---------------------------------------------------------------
  // ATTACHMENTS / VOICE
  // ---------------------------------------------------------------
  $('#attachBtn').addEventListener('click', () => $('#fileUpload').click());
  $('#fileUpload').addEventListener('change', (e) => {
    handleAttachFiles(e.target.files);
    e.target.value = '';
  });

  // Drag and drop
  ['dragover', 'drop'].forEach(evt => {
    document.body.addEventListener(evt, (e) => e.preventDefault());
  });
  document.body.addEventListener('drop', (e) => {
    if (e.dataTransfer.files.length) handleAttachFiles(e.dataTransfer.files);
  });

  // Paste image
  userInput.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items || [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) handleAttachFiles([file]);
      }
    }
  });

  function setupSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'vi-VN';
    recognition.onresult = (e) => {
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      userInput.value = transcript;
      autoGrow();
    };
    recognition.onend = () => {
      isRecording = false;
      $('#micBtn').classList.remove('recording');
    };
  }
  setupSpeech();

  $('#micBtn').addEventListener('click', () => {
    if (!recognition) { showToast('Voice input not supported in this browser'); return; }
    if (isRecording) {
      recognition.stop();
      isRecording = false;
      $('#micBtn').classList.remove('recording');
    } else {
      try {
        recognition.start();
        isRecording = true;
        $('#micBtn').classList.add('recording');
        showToast('Listening...', '🎤');
      } catch (err) { /* already started */ }
    }
  });

  // ---------------------------------------------------------------
  // SIDEBAR CONTROLS
  // ---------------------------------------------------------------
  function collapseSidebar(collapsed) {
    sidebar.classList.toggle('collapsed', collapsed);
    $('#expandBtn').classList.toggle('visible', collapsed);
    const isMobile = window.innerWidth <= 880;
    $('#sidebarBackdrop').classList.toggle('visible', isMobile && !collapsed);
    state.settings.sidebarCollapsed = collapsed;
    saveSettings();
  }
  $('#collapseBtn').addEventListener('click', () => collapseSidebar(true));
  $('#expandBtn').addEventListener('click', () => collapseSidebar(false));
  $('#mobileSidebarBtn').addEventListener('click', () => collapseSidebar(!sidebar.classList.contains('collapsed')));
  $('#sidebarBackdrop').addEventListener('click', () => collapseSidebar(true));

  let lastIsMobile = window.innerWidth <= 880;
  window.addEventListener('resize', () => {
    const isMobile = window.innerWidth <= 880;
    if (isMobile !== lastIsMobile) {
      lastIsMobile = isMobile;
      // Crossing the breakpoint: collapse on entering mobile, restore saved state on leaving it
      collapseSidebar(isMobile ? true : !!state.settings.sidebarCollapsed);
    } else if (isMobile) {
      // Still on mobile but resized (e.g. orientation change) — keep backdrop in sync
      $('#sidebarBackdrop').classList.toggle('visible', !sidebar.classList.contains('collapsed'));
    }
  });

  $('#newChatBtn').addEventListener('click', () => {
    state.activeId = null;
    saveConversations();
    renderHistory();
    setActiveView('dashboard');
    renderChatEmpty();
    chatTitle.textContent = 'New conversation';
    $('#quickSuggestRow').innerHTML = '';
    userInput.focus();
    if (window.innerWidth <= 880) collapseSidebar(true);
  });

  $('#searchInput').addEventListener('input', (e) => renderHistory(e.target.value));

  $('#clearAllBtn').addEventListener('click', () => {
    if (Object.keys(state.conversations).length === 0) return;
    if (confirm('Clear all conversation history? This cannot be undone.')) {
      state.conversations = {};
      state.activeId = null;
      saveConversations();
      renderHistory();
      renderChatEmpty();
    }
  });

  // ---------------------------------------------------------------
  // SETTINGS MODAL
  // ---------------------------------------------------------------
  const settingsModal = $('#settingsModal');
  $('#settingsBtn').addEventListener('click', () => openSettings());
  $('#closeSettingsBtn').addEventListener('click', () => settingsModal.classList.remove('open'));
  settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.remove('open'); });

  function openSettings(tabName) {
    settingsModal.classList.add('open');
    syncSettingsForm();
    if (typeof tabName === 'string' && tabName) {
      $$('.settings-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
      $$('.settings-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tabName));
    }
  }

  $$('.settings-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.settings-tab').forEach(t => t.classList.remove('active'));
      $$('.settings-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      $(`.settings-panel[data-panel="${tab.dataset.tab}"]`).classList.add('active');
    });
  });

  const STREAM_SPEED_LABELS = { 1: 'Very slow', 2: 'Slow', 3: 'Normal', 4: 'Fast', 5: 'Instant' };

  function syncSettingsForm() {
    const s = state.settings;
    $('#languageSelect').value = s.language;
    $$('.swatch').forEach(sw => sw.classList.toggle('active', sw.dataset.theme === s.theme));
    $$('#accentRow .accent-dot[data-accent]').forEach(d => d.classList.toggle('active', d.dataset.accent.toLowerCase() === s.accent.toLowerCase()));
    $('#customAccentInput').value = s.accent;
    $('#autoThemeToggle').checked = s.autoTheme;
    $('#fontSizeRange').value = s.fontSize;
    $('#fontSizeValue').textContent = s.fontSize + 'px';
    $('#radiusRange').value = s.radius;
    $('#radiusValue').textContent = s.radius + 'px';
    $('#fontFamilySelect').value = s.fontFamily;
    syncPresetDropdown('#bgPresetSelect', '#bgUrlRow', s.bgUrl);
    $('#bgUrl').value = s.bgUrl;
    $('#bgOpacity').value = s.bgOpacity;
    $('#bgOpacityValue').textContent = Math.round(s.bgOpacity * 100) + '%';
    $('#compactToggle').checked = s.compact;
    $('#reduceMotionToggle').checked = s.reduceMotion;
    $('#showAvatarsToggle').checked = s.showAvatars;

    syncPresetDropdown('#instructionsPresetSelect', null, s.customInstructions);
    $('#customInstructions').value = s.customInstructions;
    $('#nicknameInput').value = s.nickname;
    $('#toneSelect').value = s.tone;
    $('#enterToSendToggle').checked = s.enterToSend;
    $('#suggestToggle').checked = s.suggestFollowups;
    $('#streamToggle').checked = s.streamResponses;
    $('#streamSpeedRange').value = s.streamSpeed;
    $('#streamSpeedValue').textContent = STREAM_SPEED_LABELS[s.streamSpeed] || 'Normal';
    $('#autoRenameToggle').checked = s.autoRename;
    $('#confirmDeleteToggle').checked = s.confirmDelete;
    $('#spellcheckToggle').checked = s.spellcheck;
    userInput.spellcheck = s.spellcheck;

    $('#defaultModelSelect').value = s.defaultModel;
    $('#temperatureRange').value = s.temperature;
    $('#temperatureValue').textContent = s.temperature;
    $('#maxTokensRange').value = s.maxTokens;
    $('#maxTokensValue').textContent = s.maxTokens === 0 ? 'No limit' : s.maxTokens;
    $('#defaultWebSearchToggle').checked = s.defaultWebSearch;
    $('#defaultThinkingToggle').checked = s.defaultThinking;
    syncPresetDropdown('#endpointPresetSelect', '#endpointInputRow', s.endpoint, false);
    $('#endpointInput').value = s.endpoint;
    $('#apiKeyInput').value = s.apiKey;

    $('#saveLocallyToggle').checked = s.saveLocally;
    $('#includeHistoryToggle').checked = s.includeHistory;
    $('#analyticsToggle').checked = s.analytics;
    $('#maskAttachmentsToggle').checked = s.maskAttachments;
    $('#autoDeleteSelect').value = String(s.autoDeleteDays);

    ['languageSelect','fontFamilySelect','bgPresetSelect','instructionsPresetSelect','toneSelect','defaultModelSelect','endpointPresetSelect','autoDeleteSelect'].forEach(refreshCustomSelect);
    updateStorageMeta();
  }

  // Keeps a "preset + custom" dropdown/textbox pair in sync: selects the matching
  // preset option if the current value is one of the named options, otherwise
  // falls back to "custom" and (optionally) reveals the paired text row.
  function syncPresetDropdown(selectSel, customRowSel, currentValue) {
    const select = $(selectSel);
    if (!select) return;
    const options = Array.from(select.options).map(o => o.value);
    const isKnownPreset = options.includes(currentValue) && currentValue !== 'custom';
    if (isKnownPreset) {
      select.value = currentValue;
      if (customRowSel) $(customRowSel).style.display = 'none';
    } else {
      select.value = 'custom';
      if (customRowSel) $(customRowSel).style.display = '';
    }
    if (select.id) refreshCustomSelect(select.id);
  }

  function applyTheme() {
    const s = state.settings;
    document.body.className = s.theme === 'dark' ? '' : `theme-${s.theme}`;
    document.documentElement.style.setProperty('--accent', s.accent);
    document.documentElement.style.setProperty('--accent-rgb', hexToRgb(s.accent));
    document.documentElement.style.setProperty('--font-size-chat', s.fontSize + 'px');
    document.documentElement.style.setProperty('--radius-lg', s.radius + 'px');
    document.documentElement.style.setProperty('--bg-image', s.bgUrl ? `url('${s.bgUrl}')` : 'none');
    document.documentElement.style.setProperty('--bg-opacity', s.bgOpacity);
    document.body.style.fontFamily = s.fontFamily;
    document.body.classList.toggle('reduce-motion', !!s.reduceMotion);
    document.body.classList.toggle('hide-avatars', !s.showAvatars);
    updateThemeIcon();
  }

  function hexToRgb(hex) {
    const m = hex.replace('#', '');
    const bigint = parseInt(m, 16);
    return `${(bigint >> 16) & 255}, ${(bigint >> 8) & 255}, ${bigint & 255}`;
  }

  function updateThemeIcon() {
    const icon = $('#themeIcon');
    const isLight = state.settings.theme === 'light';
    icon.innerHTML = isLight
      ? `<circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`
      : `<path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.4 5.4 0 01-7.54-7.54A9 9 0 0012 3z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>`;
  }

  function applySystemTheme() {
    if (!state.settings.autoTheme) return;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    state.settings.theme = prefersDark ? 'dark' : 'light';
    applyTheme();
  }
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applySystemTheme);
  }

  // --- Appearance ---
  $('#languageSelect').addEventListener('change', (e) => {
    state.settings.language = e.target.value;
    saveSettings();
    applyLanguage(state.settings.language);
    syncSettingsForm();
    renderHistory();
    renderActiveChat();
    if (state.activeView === 'explore') renderScriptLibrary();
    if (state.activeView === 'projects') renderProjects();
    showToast(state.settings.language === 'vi' ? 'Đã chuyển sang Tiếng Việt' : 'Switched to English', '🌐');
  });
  $$('.swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      state.settings.theme = swatch.dataset.theme;
      state.settings.autoTheme = false;
      $('#autoThemeToggle').checked = false;
      $$('.swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      applyTheme(); saveSettings();
    });
  });
  $('#autoThemeToggle').addEventListener('change', (e) => {
    state.settings.autoTheme = e.target.checked;
    saveSettings();
    if (e.target.checked) applySystemTheme();
  });
  $$('#accentRow .accent-dot[data-accent]').forEach(dot => {
    dot.addEventListener('click', () => {
      state.settings.accent = dot.dataset.accent;
      $$('#accentRow .accent-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      applyTheme(); saveSettings();
    });
  });
  $('#customAccentInput').addEventListener('input', (e) => {
    state.settings.accent = e.target.value;
    $$('#accentRow .accent-dot[data-accent]').forEach(d => d.classList.remove('active'));
    applyTheme(); saveSettings();
  });
  $('#fontSizeRange').addEventListener('input', (e) => { state.settings.fontSize = +e.target.value; $('#fontSizeValue').textContent = e.target.value + 'px'; applyTheme(); saveSettings(); });
  $('#radiusRange').addEventListener('input', (e) => { state.settings.radius = +e.target.value; $('#radiusValue').textContent = e.target.value + 'px'; applyTheme(); saveSettings(); });
  $('#fontFamilySelect').addEventListener('change', (e) => { state.settings.fontFamily = e.target.value; applyTheme(); saveSettings(); });
  $('#bgPresetSelect').addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      $('#bgUrlRow').style.display = '';
      $('#bgUrl').focus();
      return;
    }
    $('#bgUrlRow').style.display = 'none';
    state.settings.bgUrl = val;
    $('#bgUrl').value = val;
    applyTheme(); saveSettings();
  });
  $('#bgUrl').addEventListener('change', (e) => { state.settings.bgUrl = e.target.value; applyTheme(); saveSettings(); });
  $('#bgOpacity').addEventListener('input', (e) => { state.settings.bgOpacity = +e.target.value; $('#bgOpacityValue').textContent = Math.round(e.target.value * 100) + '%'; applyTheme(); saveSettings(); });
  $('#compactToggle').addEventListener('change', (e) => { state.settings.compact = e.target.checked; saveSettings(); renderActiveChat(); });
  $('#reduceMotionToggle').addEventListener('change', (e) => { state.settings.reduceMotion = e.target.checked; applyTheme(); saveSettings(); });
  $('#showAvatarsToggle').addEventListener('change', (e) => { state.settings.showAvatars = e.target.checked; applyTheme(); saveSettings(); });
  $('#resetAppearanceBtn').addEventListener('click', () => {
    Object.assign(state.settings, {
      theme: 'dark', autoTheme: false, accent: '#3b82f6', fontSize: 15, radius: 18,
      fontFamily: "'Plus Jakarta Sans', 'Inter', 'Segoe UI', sans-serif", bgUrl: '', bgOpacity: 0.92,
      compact: false, reduceMotion: false, showAvatars: true
    });
    applyTheme(); saveSettings(); syncSettingsForm();
    showToast('Appearance reset to defaults');
  });

  $('#themeToggleBtn').addEventListener('click', () => {
    state.settings.theme = state.settings.theme === 'light' ? 'dark' : 'light';
    state.settings.autoTheme = false;
    applyTheme(); saveSettings();
  });

  // --- Behavior ---
  $('#instructionsPresetSelect').addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'custom' || val === '') {
      $('#customInstructions').focus();
      return;
    }
    state.settings.customInstructions = val;
    $('#customInstructions').value = val;
    saveSettings();
  });
  $('#customInstructions').addEventListener('change', (e) => {
    state.settings.customInstructions = e.target.value;
    saveSettings();
    syncPresetDropdown('#instructionsPresetSelect', null, e.target.value);
  });
  $('#nicknameInput').addEventListener('change', (e) => { state.settings.nickname = e.target.value; saveSettings(); });
  $('#toneSelect').addEventListener('change', (e) => { state.settings.tone = e.target.value; saveSettings(); });
  $('#enterToSendToggle').addEventListener('change', (e) => { state.settings.enterToSend = e.target.checked; saveSettings(); });
  $('#suggestToggle').addEventListener('change', (e) => { state.settings.suggestFollowups = e.target.checked; saveSettings(); });
  $('#streamToggle').addEventListener('change', (e) => { state.settings.streamResponses = e.target.checked; saveSettings(); });
  $('#streamSpeedRange').addEventListener('input', (e) => { state.settings.streamSpeed = +e.target.value; $('#streamSpeedValue').textContent = STREAM_SPEED_LABELS[e.target.value]; saveSettings(); });
  $('#autoRenameToggle').addEventListener('change', (e) => { state.settings.autoRename = e.target.checked; saveSettings(); });
  $('#confirmDeleteToggle').addEventListener('change', (e) => { state.settings.confirmDelete = e.target.checked; saveSettings(); });
  $('#spellcheckToggle').addEventListener('change', (e) => { state.settings.spellcheck = e.target.checked; userInput.spellcheck = e.target.checked; saveSettings(); });

  // --- Models & API ---
  $('#defaultModelSelect').addEventListener('change', (e) => {
    state.settings.defaultModel = e.target.value; saveSettings();
    currentModel = e.target.value;
    $('#modelTriggerLabel').textContent = MODEL_LABELS[currentModel];
    $$('.model-option').forEach(o => o.classList.toggle('active', o.dataset.model === currentModel));
  });
  $('#temperatureRange').addEventListener('input', (e) => { state.settings.temperature = +e.target.value; $('#temperatureValue').textContent = e.target.value; saveSettings(); });
  $('#maxTokensRange').addEventListener('input', (e) => {
    state.settings.maxTokens = +e.target.value;
    $('#maxTokensValue').textContent = e.target.value == 0 ? 'No limit' : e.target.value;
    saveSettings();
  });
  $('#defaultWebSearchToggle').addEventListener('change', (e) => { state.settings.defaultWebSearch = e.target.checked; webSearchActive = e.target.checked; $('#webSearchToggle').dataset.active = String(webSearchActive); saveSettings(); });
  $('#defaultThinkingToggle').addEventListener('change', (e) => { state.settings.defaultThinking = e.target.checked; thinkActive = e.target.checked; $('#thinkToggle').dataset.active = String(thinkActive); saveSettings(); });
  $('#endpointPresetSelect').addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      $('#endpointInputRow').style.display = '';
      $('#endpointInput').focus();
      return;
    }
    $('#endpointInputRow').style.display = 'none';
    state.settings.endpoint = val;
    $('#endpointInput').value = val;
    saveSettings();
  });
  $('#endpointInput').addEventListener('change', (e) => { state.settings.endpoint = e.target.value.trim() || '/chat'; saveSettings(); });
  $('#apiKeyInput').addEventListener('change', (e) => { state.settings.apiKey = e.target.value; saveSettings(); });
  $('#toggleApiKeyBtn').addEventListener('click', () => {
    const input = $('#apiKeyInput');
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    $('#toggleApiKeyBtn').textContent = showing ? 'Show' : 'Hide';
  });
  $('#testConnectionBtn').addEventListener('click', async () => {
    const statusEl = $('#connectionStatus');
    statusEl.textContent = 'Testing…'; statusEl.className = 'connection-status';
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (state.settings.apiKey) headers['Authorization'] = `Bearer ${state.settings.apiKey}`;
      const res = await fetch(state.settings.endpoint || '/chat', {
        method: 'POST', headers, body: JSON.stringify({ message: '__ping__', mode: currentModel, ping: true })
      });
      if (res.ok || res.status === 400) {
        statusEl.textContent = `Reachable (status ${res.status})`; statusEl.className = 'connection-status ok';
      } else {
        statusEl.textContent = `Responded with status ${res.status}`; statusEl.className = 'connection-status fail';
      }
    } catch (err) {
      statusEl.textContent = 'Could not reach endpoint'; statusEl.className = 'connection-status fail';
      pushNotification('error', 'Connection test failed', `Could not reach ${state.settings.endpoint || '/chat'}.`);
    }
  });

  // --- Privacy ---
  $('#saveLocallyToggle').addEventListener('change', (e) => { state.settings.saveLocally = e.target.checked; saveSettings(); });
  $('#includeHistoryToggle').addEventListener('change', (e) => { state.settings.includeHistory = e.target.checked; saveSettings(); });
  $('#analyticsToggle').addEventListener('change', (e) => { state.settings.analytics = e.target.checked; saveSettings(); });
  $('#maskAttachmentsToggle').addEventListener('change', (e) => { state.settings.maskAttachments = e.target.checked; saveSettings(); });
  $('#autoDeleteSelect').addEventListener('change', (e) => { state.settings.autoDeleteDays = +e.target.value; saveSettings(); runAutoDelete(); });

  function runAutoDelete() {
    const days = state.settings.autoDeleteDays;
    if (!days) return;
    const cutoff = Date.now() - days * 86400000;
    let changed = false;
    Object.keys(state.conversations).forEach(id => {
      if (state.conversations[id].updatedAt < cutoff && !state.conversations[id].pinned) {
        delete state.conversations[id];
        changed = true;
      }
    });
    if (changed) { saveConversations(); renderHistory(); }
  }

  // --- Data controls ---
  $('#exportAllBtn').addEventListener('click', () => {
    const payload = { conversations: state.conversations, projects: state.projects, exportedAt: Date.now(), version: 2 };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `ocean-ai-export-${new Date().toISOString().slice(0, 10)}.json`);
    showToast('Exported all conversations');
  });
  $('#exportAllMdBtn').addEventListener('click', () => {
    let bundle = `# Ocean AI conversation export\nExported ${new Date().toLocaleString()}\n\n`;
    Object.values(state.conversations).sort((a, b) => b.updatedAt - a.updatedAt).forEach(c => {
      bundle += `\n\n## ${c.title}\n\n`;
      c.messages.forEach(m => { bundle += `**${m.role === 'user' ? 'You' : 'Ocean AI'}:**\n\n${m.content}\n\n---\n\n`; });
    });
    const blob = new Blob([bundle], { type: 'text/markdown' });
    downloadBlob(blob, `ocean-ai-all-chats-${new Date().toISOString().slice(0, 10)}.md`);
    showToast('Exported all chats as Markdown');
  });

  // --- Import flow: dropzone -> preview -> mode select -> progress -> commit ---
  let pendingImportData = null;
  const importDropzone = $('#importDropzone');
  const importFileInput = $('#importFile');
  const importPreview = $('#importPreview');

  importDropzone.addEventListener('click', () => importFileInput.click());
  importDropzone.addEventListener('dragover', (e) => { e.preventDefault(); importDropzone.classList.add('dragover'); });
  importDropzone.addEventListener('dragleave', () => importDropzone.classList.remove('dragover'));
  importDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    importDropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length) readImportFile(e.dataTransfer.files[0]);
  });
  importFileInput.addEventListener('change', (e) => {
    if (e.target.files.length) readImportFile(e.target.files[0]);
    e.target.value = '';
  });

  function readImportFile(file) {
    if (!file.name.endsWith('.json')) { showToast('Please select a .json export file'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const convos = parsed.conversations || parsed; // support raw map or wrapped payload
        if (!convos || typeof convos !== 'object' || Array.isArray(convos)) throw new Error('bad shape');
        pendingImportData = { conversations: convos, projects: parsed.projects || {} };
        showImportPreview(pendingImportData);
      } catch (err) {
        showToast('That file doesn\'t look like a valid Ocean AI export');
      }
    };
    reader.readAsText(file);
  }

  function showImportPreview(data) {
    const entries = Object.values(data.conversations);
    const newCount = entries.filter(c => !state.conversations[c.id]).length;
    const dupCount = entries.length - newCount;
    $('#importSummary').textContent = `${entries.length} conversation${entries.length !== 1 ? 's' : ''} found · ${newCount} new, ${dupCount} already exist`;
    $('#importList').innerHTML = entries.slice(0, 50).map(c => {
      const isDup = !!state.conversations[c.id];
      return `<div class="import-list-item">
        <span>${escapeHtml(c.title || 'Untitled')} <span style="color:var(--text-tertiary)">(${(c.messages || []).length} msgs)</span></span>
        <span class="il-badge ${isDup ? 'dup' : 'new'}">${isDup ? 'duplicate' : 'new'}</span>
      </div>`;
    }).join('') + (entries.length > 50 ? `<div class="import-list-item">…and ${entries.length - 50} more</div>` : '');
    importPreview.style.display = 'block';
    $('#importProgress').style.display = 'none';
  }

  $('#cancelImportBtn').addEventListener('click', () => {
    pendingImportData = null;
    importPreview.style.display = 'none';
  });

  $('#confirmImportBtn').addEventListener('click', () => {
    if (!pendingImportData) return;
    const mode = document.querySelector('input[name="importMode"]:checked').value;
    const entries = Object.values(pendingImportData.conversations);
    const progressWrap = $('#importProgress');
    const fill = $('#importProgressFill');
    const label = $('#importProgressLabel');
    progressWrap.style.display = 'flex';
    $('#confirmImportBtn').disabled = true;
    $('#cancelImportBtn').disabled = true;

    if (mode === 'replace') {
      state.conversations = {};
      state.projects = {};
    }

    let i = 0;
    function step() {
      if (i >= entries.length) {
        Object.assign(state.projects, pendingImportData.projects);
        saveConversations();
        saveProjects();
        renderHistory();
        renderProjects();
        label.textContent = `Imported ${entries.length} conversation${entries.length !== 1 ? 's' : ''}`;
        showToast(`Imported ${entries.length} conversation${entries.length !== 1 ? 's' : ''}`, '📥');
        pushNotification('import', 'Import complete', `${entries.length} conversation${entries.length !== 1 ? 's' : ''} imported (${mode} mode).`);
        setTimeout(() => {
          importPreview.style.display = 'none';
          progressWrap.style.display = 'none';
          $('#confirmImportBtn').disabled = false;
          $('#cancelImportBtn').disabled = false;
          pendingImportData = null;
        }, 900);
        return;
      }
      const convo = entries[i];
      const id = (mode === 'merge' && state.conversations[convo.id]) ? uid() : convo.id;
      state.conversations[id] = Object.assign({}, convo, { id });
      i++;
      fill.style.width = Math.round((i / entries.length) * 100) + '%';
      label.textContent = `Importing ${i} of ${entries.length}…`;
      requestAnimationFrame(() => setTimeout(step, 12));
    }
    step();
  });

  $('#clearAllSettingsBtn').addEventListener('click', () => {
    if (confirm('Delete ALL conversations permanently?')) {
      state.conversations = {}; state.activeId = null;
      saveConversations(); renderHistory(); renderChatEmpty();
      showToast('All conversations deleted');
    }
  });
  $('#resetSettingsBtn').addEventListener('click', () => {
    if (!confirm('Reset every setting to its default value?')) return;
    localStorage.removeItem(SETTINGS_KEY);
    location.reload();
  });

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  // ---------------------------------------------------------------
  // SHARE / EXPORT
  // ---------------------------------------------------------------
  const shareModal = $('#shareModal');
  $('#shareBtn').addEventListener('click', () => {
    const convo = getActiveConversation();
    if (!convo) { showToast('Start a conversation first'); return; }
    $('#shareLink').value = `${location.origin}${location.pathname}#chat=${convo.id}`;
    shareModal.classList.add('open');
  });
  $('#closeShareBtn').addEventListener('click', () => shareModal.classList.remove('open'));
  shareModal.addEventListener('click', (e) => { if (e.target === shareModal) shareModal.classList.remove('open'); });
  $('#copyShareLinkBtn').addEventListener('click', () => {
    navigator.clipboard.writeText($('#shareLink').value).then(() => showToast('Link copied'));
  });
  $('#exportMdBtn').addEventListener('click', () => exportConversation('md'));
  $('#exportTxtBtn').addEventListener('click', () => exportConversation('txt'));
  $('#exportBtn').addEventListener('click', () => exportConversation('md'));

  function exportConversation(format) {
    const convo = getActiveConversation();
    if (!convo) { showToast('No active conversation'); return; }
    let content = '';
    if (format === 'md') {
      content = `# ${convo.title}\n\n`;
      convo.messages.forEach(m => {
        content += `**${m.role === 'user' ? 'You' : 'Ocean AI'}:**\n\n${m.content}\n\n---\n\n`;
      });
    } else {
      content = `${convo.title}\n${'='.repeat(convo.title.length)}\n\n`;
      convo.messages.forEach(m => {
        content += `${m.role === 'user' ? 'You' : 'Ocean AI'}: ${m.content}\n\n`;
      });
    }
    const blob = new Blob([content], { type: 'text/plain' });
    downloadBlob(blob, `${convo.title.replace(/[^\w\- ]/g, '').slice(0, 40) || 'conversation'}.${format}`);
    shareModal.classList.remove('open');
  }

  // ---------------------------------------------------------------
  // NAV ITEMS (Dashboard / Explore models / Projects)
  // ---------------------------------------------------------------
  $$('.nav-menu .nav-item').forEach(item => {
    item.addEventListener('click', () => {
      setActiveView(item.dataset.view);
      if (window.innerWidth <= 880) collapseSidebar(true);
    });
  });

  const projectModal = $('#projectModal');
  let selectedProjectColor = '#3b82f6';
  $('#newProjectBtn').addEventListener('click', () => {
    $('#projectNameInput').value = '';
    $('#projectInstructionsInput').value = '';
    selectedProjectColor = '#3b82f6';
    $$('#projectColorRow .accent-dot').forEach((d, i) => d.classList.toggle('active', i === 0));
    projectModal.classList.add('open');
    $('#projectNameInput').focus();
  });
  $('#closeProjectBtn').addEventListener('click', () => projectModal.classList.remove('open'));
  $('#cancelProjectBtn').addEventListener('click', () => projectModal.classList.remove('open'));
  projectModal.addEventListener('click', (e) => { if (e.target === projectModal) projectModal.classList.remove('open'); });
  $$('#projectColorRow .accent-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      selectedProjectColor = dot.dataset.color;
      $$('#projectColorRow .accent-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
    });
  });
  $('#saveProjectBtn').addEventListener('click', () => {
    const name = $('#projectNameInput').value.trim();
    if (!name) { showToast('Give the project a name'); $('#projectNameInput').focus(); return; }
    createProject(name, $('#projectInstructionsInput').value, selectedProjectColor);
    projectModal.classList.remove('open');
    showToast('Project created', '📁');
    pushNotification('project', 'Project created', `"${name}" is ready for new chats.`);
  });

  // ---------------------------------------------------------------
  // CODE BLOCK COPY (delegated — covers chat messages + script library modal)
  // ---------------------------------------------------------------
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.copy-code-btn');
    if (!btn) return;
    const target = document.getElementById(btn.dataset.target);
    if (!target) return;
    navigator.clipboard.writeText(target.textContent).then(() => {
      const original = btn.innerHTML;
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg> Copied`;
      setTimeout(() => { btn.innerHTML = original; }, 1600);
      showToast('Code copied to clipboard');
    }).catch(() => showToast('Could not copy — select and copy manually'));
  });

  // ---------------------------------------------------------------
  // KEYBOARD SHORTCUTS
  // ---------------------------------------------------------------
  document.addEventListener('keydown', (e) => {
    const meta = e.ctrlKey || e.metaKey;
    const typingInField = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);

    if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#searchInput').focus(); collapseSidebar(false); }
    if (meta && e.shiftKey && e.key.toLowerCase() === 'o') { e.preventDefault(); $('#newChatBtn').click(); }
    if (meta && e.key.toLowerCase() === 'b' && !typingInField) { e.preventDefault(); collapseSidebar(!sidebar.classList.contains('collapsed')); }
    if (meta && e.key.toLowerCase() === 'j') { e.preventDefault(); $('#themeToggleBtn').click(); }
    if (meta && e.key === ',') { e.preventDefault(); openSettings(); }
    if (meta && e.key === 'Backspace' && isGenerating) { e.preventDefault(); stopGeneration(); }
    if (e.key === 'Escape') {
      settingsModal.classList.remove('open');
      shareModal.classList.remove('open');
      projectModal.classList.remove('open');
      $('#scriptDetailModal').classList.remove('open');
      modelDropdown.classList.remove('open');
    }
  });

  // ---------------------------------------------------------------
  // INIT
  // ---------------------------------------------------------------
  // ---------------------------------------------------------------
  // CUSTOM OCEAN-STYLE SELECT (wraps native <select>, keeps it as source of truth)
  // ---------------------------------------------------------------
  function buildCustomSelects() {
    $$('.osel').forEach(wrap => {
      const select = wrap.querySelector('select');
      const trigger = wrap.querySelector('.osel-trigger');
      const label = wrap.querySelector('.osel-label');
      const menu = wrap.querySelector('.osel-menu');
      if (!select || wrap.dataset.bound) return;
      wrap.dataset.bound = '1';

      function render() {
        const opts = Array.from(select.options);
        const current = opts[select.selectedIndex];
        label.textContent = current ? current.textContent : '';
        menu.innerHTML = opts.map((o, i) => `<div class="osel-option ${i === select.selectedIndex ? 'selected' : ''}" data-i="${i}">${escapeHtml(o.textContent)}</div>`).join('');
        menu.querySelectorAll('.osel-option').forEach(opt => {
          opt.addEventListener('click', () => {
            select.selectedIndex = parseInt(opt.dataset.i);
            select.dispatchEvent(new Event('change', { bubbles: true }));
            render();
            wrap.classList.remove('open');
          });
        });
      }

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        $$('.osel.open').forEach(o => { if (o !== wrap) o.classList.remove('open'); });
        wrap.classList.toggle('open');
      });

      select.addEventListener('change', render);
      wrap._oselRender = render;
      render();
    });

    document.addEventListener('click', () => $$('.osel.open').forEach(o => o.classList.remove('open')));
  }

  function refreshCustomSelect(selectId) {
    const select = document.getElementById(selectId);
    const wrap = select && select.closest('.osel');
    if (wrap && wrap._oselRender) wrap._oselRender();
  }

  function init() {
    loadState();
    runAutoDelete();
    applyLanguage(state.settings.language || 'en');
    currentModel = state.settings.defaultModel || 'ocean-pro';
    webSearchActive = !!state.settings.defaultWebSearch;
    thinkActive = !!state.settings.defaultThinking;
    $('#webSearchToggle').dataset.active = String(webSearchActive);
    $('#thinkToggle').dataset.active = String(thinkActive);
    $('#modelTriggerLabel').textContent = MODEL_LABELS[currentModel];
    $$('.model-option').forEach(o => o.classList.toggle('active', o.dataset.model === currentModel));
    const activeDot = document.querySelector(`.model-option[data-model="${currentModel}"] .model-dot`);
    if (activeDot) modelTrigger.querySelector('.model-dot').className = 'model-dot ' + (activeDot.classList[1] || '');
    userInput.spellcheck = state.settings.spellcheck;

    if (state.settings.autoTheme) applySystemTheme(); else applyTheme();
    const shouldCollapseOnLoad = window.innerWidth <= 880 ? true : !!state.settings.sidebarCollapsed;
    collapseSidebar(shouldCollapseOnLoad);

    setActiveView('dashboard');
    if (state.activeId && state.conversations[state.activeId]) {
      renderActiveChat();
    } else {
      renderChatEmpty();
    }
    renderHistory();
    renderProjects();
    autoGrow();
    buildCustomSelects();
  }

  init();
})();