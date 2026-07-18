import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Text, Arrow, Line, Group } from 'react-konva';
import Konva from 'konva';

interface Player {
  id: string;
  x: number;
  y: number;
  number: number;
  name: string;
  color: string;
  team: 'home' | 'away';
  isSelected: boolean;
}

const createArcPoints = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number, segments = 12): number[] => {
  const points: number[] = [];
  let normalizedEnd = endAngle;
  if (normalizedEnd <= startAngle) {
    normalizedEnd += 360;
  }
  const step = (normalizedEnd - startAngle) / segments;
  for (let i = 0; i <= segments; i += 1) {
    const angle = (startAngle + step * i) * (Math.PI / 180);
    points.push(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
  }
  return points;
};

interface ArrowData {
  id: string;
  points: number[];
  color: string;
}

interface TextData {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  fontStyle: 'normal' | 'bold';
}

interface BallData {
  id: string;
  x: number;
  y: number;
  color: string;
}

interface SelectedItem {
  type: 'player' | 'arrow' | 'text' | 'ball';
  id: string;
}

interface SelectionBox {
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  startX: number;
  startY: number;
}

interface Project {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  data: { players: Player[]; arrows: ArrowData[]; texts: TextData[]; balls: BallData[]; pitchColor?: string; lineColor?: string; arrowColor?: string; playerNumberColor?: string; playerNameColor?: string };
}

const App: React.FC = () => {
  const defaultPitchColor = '#ffffff';
  const defaultLineColor = '#000000';
  const defaultBallColor = '#000000';
  const defaultArrowColor = '#ff0000';
  const defaultPlayerNumberColor = '#ffffff';
  const defaultPlayerNameColor = '#000000';
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [arrows, setArrows] = useState<ArrowData[]>([]);
  const [texts, setTexts] = useState<TextData[]>([]);
  const [projectTitle, setProjectTitle] = useState('');
  const [tool, setTool] = useState<'playerHome' | 'playerAway' | 'arrow' | 'text' | 'ball' | 'select'>('select');
  const [homeColor, setHomeColor] = useState('#1976d2');
  const [awayColor, setAwayColor] = useState('#d32f2f');
  const [ballColor, setBallColor] = useState(defaultBallColor);
  const [pitchColor, setPitchColor] = useState(defaultPitchColor);
  const [lineColor, setLineColor] = useState(defaultLineColor);
  const [arrowColor, setArrowColor] = useState(defaultArrowColor);
  const [playerNumberColor, setPlayerNumberColor] = useState(defaultPlayerNumberColor);
  const [playerNameColor, setPlayerNameColor] = useState(defaultPlayerNameColor);
  const [drawingArrow, setDrawingArrow] = useState<{ start: { x: number; y: number } | null; end: { x: number; y: number } | null }>({ start: null, end: null });
  const [balls, setBalls] = useState<BallData[]>([]);
  const [previousState, setPreviousState] = useState<{ players: Player[]; arrows: ArrowData[]; texts: TextData[]; balls: BallData[]; pitchColor: string; lineColor: string; arrowColor: string; playerNumberColor: string; playerNameColor: string } | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [dragGroupPositions, setDragGroupPositions] = useState<Record<string, any> | null>(null);
  const [dragStartPoint, setDragStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [textInputValue, setTextInputValue] = useState('');
  const [textColor, setTextColor] = useState('#000000');
  const [textFontSize, setTextFontSize] = useState(16);
  const [textBold, setTextBold] = useState(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox>({ visible: false, x: 0, y: 0, width: 0, height: 0, startX: 0, startY: 0 });
  const [suppressNextStageClick, setSuppressNextStageClick] = useState(false);
  const [page, setPage] = useState<'landing' | 'newProject' | 'editor'>('landing');
  const [sidebarTab, setSidebarTab] = useState<'tools' | 'text' | 'colors' | 'file'>('tools');
  const [newProjectForm, setNewProjectForm] = useState<{
    title: string;
    homePlayers: Array<{ id: string; x: number; y: number; number: number; name: string; team: 'home'; role: string }>;
    awayPlayers: Array<{ id: string; x: number; y: number; number: number; name: string; team: 'away'; role: string }>;
  } | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pitchWidth = 800;
  const pitchHeight = 500;
  const benchHeight = 120;
  const stageWidth = pitchWidth;
  const benchWidth = pitchWidth;
  const editorPanelWidth = stageWidth;
  const stageHeight = pitchHeight + benchHeight;

  useEffect(() => {
    if (currentProject) {
      setPlayers(currentProject.data.players.map(player => ({
        ...player,
        name: player.name || `選手${player.number}`,
        color: player.color ?? '#1976d2',
        team: player.team ?? 'home',
        isSelected: false,
      })));
      setArrows(currentProject.data.arrows.map(arrow => ({
        ...arrow,
        color: arrow.color ?? currentProject.data.arrowColor ?? defaultArrowColor,
      })));
      setTexts(currentProject.data.texts.map(text => ({
        ...text,
        color: text.color ?? '#000000',
        fontSize: text.fontSize ?? 16,
        fontStyle: text.fontStyle ?? 'normal',
      })));
      setBalls(currentProject.data.balls?.map(ball => ({
        ...ball,
        color: ball.color || defaultBallColor,
      })) ?? []);
      setPitchColor(currentProject.data.pitchColor ?? defaultPitchColor);
      setLineColor(currentProject.data.lineColor ?? defaultLineColor);
      setArrowColor(currentProject.data.arrowColor ?? defaultArrowColor);
      setPlayerNumberColor(currentProject.data.playerNumberColor ?? defaultPlayerNumberColor);
      setPlayerNameColor(currentProject.data.playerNameColor ?? defaultPlayerNameColor);
      setSelectedItems([]);
    }
  }, [currentProject]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (selectedItems.length === 0) return;
      deleteSelectedItems();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItems]);

  useEffect(() => {
    const selectedTextIds = selectedItems.filter(item => item.type === 'text').map(item => item.id);
    if (selectedTextIds.length !== 1) return;
    const selectedText = texts.find(text => text.id === selectedTextIds[0]);
    if (!selectedText) return;
    setTextColor(selectedText.color ?? '#000000');
    setTextFontSize(selectedText.fontSize ?? 16);
    setTextBold((selectedText.fontStyle ?? 'normal') === 'bold');
  }, [selectedItems, texts]);

  useEffect(() => {
    const selectedPlayerIds = new Set(
      selectedItems
        .filter(item => item.type === 'player')
        .map(item => item.id)
    );

    setPlayers(prev => prev.map(player => {
      const isSelected = selectedPlayerIds.has(player.id);
      return player.isSelected === isSelected ? player : { ...player, isSelected };
    }));
  }, [selectedItems]);

  const resetEditorState = () => {
    setPlayers([]);
    setArrows([]);
    setTexts([]);
    setBalls([]);
    setPitchColor(defaultPitchColor);
    setLineColor(defaultLineColor);
    setArrowColor(defaultArrowColor);
    setPlayerNumberColor(defaultPlayerNumberColor);
    setPlayerNameColor(defaultPlayerNameColor);
    setSelectedItems([]);
    setDragGroupPositions(null);
    setDragStartPoint(null);
    setPreviousState(null);
    setDrawingArrow({ start: null, end: null });
    setSelectionBox({ visible: false, x: 0, y: 0, width: 0, height: 0, startX: 0, startY: 0 });
  };

  const createNewProject = () => {
    setPage('newProject');
    setCurrentProject(null);
    resetEditorState();
    setNewProjectForm({
      title: '',
      homePlayers: [
        { id: 'player-1', x: 100, y: 250, number: 1, team: 'home', name: '選手1', role: 'GK' },
        { id: 'player-2', x: 220, y: 110, number: 2, team: 'home', name: '選手2', role: 'LSB' },
        { id: 'player-3', x: 220, y: 190, number: 3, team: 'home', name: '選手3', role: 'CB' },
        { id: 'player-4', x: 220, y: 310, number: 4, team: 'home', name: '選手4', role: 'CB' },
        { id: 'player-5', x: 220, y: 390, number: 5, team: 'home', name: '選手5', role: 'RSB' },
        { id: 'player-6', x: 360, y: 190, number: 6, team: 'home', name: '選手6', role: 'DMF' },
        { id: 'player-7', x: 360, y: 310, number: 7, team: 'home', name: '選手7', role: 'DMF' },
        { id: 'player-8', x: 360, y: 110, number: 8, team: 'home', name: '選手8', role: 'LMF' },
        { id: 'player-9', x: 360, y: 390, number: 9, team: 'home', name: '選手9', role: 'RMF' },
        { id: 'player-10', x: 520, y: 170, number: 10, team: 'home', name: '選手10', role: 'FW' },
        { id: 'player-11', x: 520, y: 330, number: 11, team: 'home', name: '選手11', role: 'FW' },
        { id: 'player-27', x: 80, y: pitchHeight + 30, number: 12, team: 'home', name: '選手12', role: '控え' },
        { id: 'player-28', x: 140, y: pitchHeight + 30, number: 13, team: 'home', name: '選手13', role: '控え' },
        { id: 'player-29', x: 200, y: pitchHeight + 30, number: 14, team: 'home', name: '選手14', role: '控え' },
        { id: 'player-30', x: 260, y: pitchHeight + 30, number: 15, team: 'home', name: '選手15', role: '控え' },
        { id: 'player-31', x: 320, y: pitchHeight + 30, number: 16, team: 'home', name: '選手16', role: '控え' },
        { id: 'player-32', x: 80, y: pitchHeight + 70, number: 17, team: 'home', name: '選手17', role: '控え' },
        { id: 'player-33', x: 140, y: pitchHeight + 70, number: 18, team: 'home', name: '選手18', role: '控え' },
        { id: 'player-34', x: 200, y: pitchHeight + 70, number: 19, team: 'home', name: '選手19', role: '控え' },
        { id: 'player-35', x: 260, y: pitchHeight + 70, number: 20, team: 'home', name: '選手20', role: '控え' },
        { id: 'player-36', x: 320, y: pitchHeight + 70, number: 21, team: 'home', name: '選手21', role: '控え' },
        { id: 'player-37', x: 80, y: pitchHeight + 110, number: 22, team: 'home', name: '選手22', role: '控え' },
        { id: 'player-38', x: 140, y: pitchHeight + 110, number: 23, team: 'home', name: '選手23', role: '控え' },
        { id: 'player-39', x: 200, y: pitchHeight + 110, number: 24, team: 'home', name: '選手24', role: '控え' },
        { id: 'player-40', x: 260, y: pitchHeight + 110, number: 25, team: 'home', name: '選手25', role: '控え' },
        { id: 'player-41', x: 320, y: pitchHeight + 110, number: 26, team: 'home', name: '選手26', role: '控え' },
      ],
      awayPlayers: [
        { id: 'player-12', x: 700, y: 250, number: 1, team: 'away', name: '選手1', role: 'GK' },
        { id: 'player-13', x: 580, y: 110, number: 2, team: 'away', name: '選手2', role: 'LSB' },
        { id: 'player-14', x: 580, y: 190, number: 3, team: 'away', name: '選手3', role: 'CB' },
        { id: 'player-15', x: 580, y: 310, number: 4, team: 'away', name: '選手4', role: 'CB' },
        { id: 'player-16', x: 580, y: 390, number: 5, team: 'away', name: '選手5', role: 'RSB' },
        { id: 'player-17', x: 440, y: 190, number: 6, team: 'away', name: '選手6', role: 'DMF' },
        { id: 'player-18', x: 440, y: 310, number: 7, team: 'away', name: '選手7', role: 'DMF' },
        { id: 'player-19', x: 440, y: 110, number: 8, team: 'away', name: '選手8', role: 'LMF' },
        { id: 'player-20', x: 440, y: 390, number: 9, team: 'away', name: '選手9', role: 'RMF' },
        { id: 'player-21', x: 280, y: 170, number: 10, team: 'away', name: '選手10', role: 'FW' },
        { id: 'player-22', x: 280, y: 330, number: 11, team: 'away', name: '選手11', role: 'FW' },
        { id: 'player-42', x: 480, y: pitchHeight + 30, number: 12, team: 'away', name: '選手12', role: '控え' },
        { id: 'player-43', x: 540, y: pitchHeight + 30, number: 13, team: 'away', name: '選手13', role: '控え' },
        { id: 'player-44', x: 600, y: pitchHeight + 30, number: 14, team: 'away', name: '選手14', role: '控え' },
        { id: 'player-45', x: 660, y: pitchHeight + 30, number: 15, team: 'away', name: '選手15', role: '控え' },
        { id: 'player-46', x: 720, y: pitchHeight + 30, number: 16, team: 'away', name: '選手16', role: '控え' },
        { id: 'player-47', x: 480, y: pitchHeight + 70, number: 17, team: 'away', name: '選手17', role: '控え' },
        { id: 'player-48', x: 540, y: pitchHeight + 70, number: 18, team: 'away', name: '選手18', role: '控え' },
        { id: 'player-49', x: 600, y: pitchHeight + 70, number: 19, team: 'away', name: '選手19', role: '控え' },
        { id: 'player-50', x: 660, y: pitchHeight + 70, number: 20, team: 'away', name: '選手20', role: '控え' },
        { id: 'player-51', x: 720, y: pitchHeight + 70, number: 21, team: 'away', name: '選手21', role: '控え' },
        { id: 'player-52', x: 480, y: pitchHeight + 110, number: 22, team: 'away', name: '選手22', role: '控え' },
        { id: 'player-53', x: 540, y: pitchHeight + 110, number: 23, team: 'away', name: '選手23', role: '控え' },
        { id: 'player-54', x: 600, y: pitchHeight + 110, number: 24, team: 'away', name: '選手24', role: '控え' },
        { id: 'player-55', x: 660, y: pitchHeight + 110, number: 25, team: 'away', name: '選手25', role: '控え' },
        { id: 'player-56', x: 720, y: pitchHeight + 110, number: 26, team: 'away', name: '選手26', role: '控え' },
      ],
    });
  };

  const updateNewProjectFormTitle = (value: string) => {
    setNewProjectForm(prev => prev ? { ...prev, title: value } : prev);
  };

  const updateNewProjectFormPlayer = (team: string, id: string, field: 'number' | 'name', value: string) => {
    setNewProjectForm(prev => {
      if (!prev) return prev;
      const playersKey = team === 'home' ? 'homePlayers' : 'awayPlayers';
      const updated = prev[playersKey].map(player => (
        player.id === id
          ? { ...player, [field]: field === 'number' ? Math.max(1, Math.floor(Number(value) || 1)) : value }
          : player
      ));
      return { ...prev, [playersKey]: updated } as typeof prev;
    });
  };

  const cancelNewProjectForm = () => {
    setNewProjectForm(null);
    setPage('landing');
  };

  const submitNewProjectForm = () => {
    if (!newProjectForm) return;
    if (!newProjectForm.title.trim()) {
      alert('タイトルを入力してください。');
      return;
    }

    const playersList: Player[] = [...newProjectForm.homePlayers, ...newProjectForm.awayPlayers].map(player => ({
      ...player,
      name: player.name.trim() || `選手${player.number}`,
      color: player.team === 'home' ? homeColor : awayColor,
      isSelected: false,
    }));

    const newProject: Project = {
      id: `project-${Date.now()}`,
      title: newProjectForm.title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: { players: playersList, arrows: [], texts: [], balls: [], arrowColor: defaultArrowColor },
    };

    resetEditorState();
    setCurrentProject(newProject);
    setProjectTitle(newProjectForm.title);
    setPage('editor');
    setNewProjectForm(null);
  };

  const openProject = (project: Project) => {
    resetEditorState();
    setCurrentProject(project);
    setProjectTitle(project.title);
    setPage('editor');
  };

  const captureStateSnapshot = () => {
    setPreviousState({
      players: players.map(player => ({ ...player })),
      arrows: arrows.map(arrow => ({ ...arrow })),
      texts: texts.map(text => ({ ...text })),
      balls: balls.map(ball => ({ ...ball })),
      pitchColor,
      lineColor,
      arrowColor,
      playerNumberColor,
      playerNameColor,
    });
  };

  const undoLastAction = () => {
    if (!previousState) return;
    setPlayers(previousState.players);
    setArrows(previousState.arrows);
    setTexts(previousState.texts);
    setBalls(previousState.balls);
    setPitchColor(previousState.pitchColor);
    setLineColor(previousState.lineColor);
    setArrowColor(previousState.arrowColor);
    setPlayerNumberColor(previousState.playerNumberColor);
    setPlayerNameColor(previousState.playerNameColor);
    setSelectedItems([]);
    setDragGroupPositions(null);
    setPreviousState(null);
  };

  const buildProjectSnapshot = (): Project | null => {
    if (!currentProject) return null;
    const title = projectTitle.trim();
    if (!title) {
      alert('タイトルを入力してください。');
      return null;
    }
    return {
      ...currentProject,
      title,
      updatedAt: new Date().toISOString(),
      data: { players, arrows, texts, balls, pitchColor, lineColor, arrowColor, playerNumberColor, playerNameColor },
    };
  };

  const exportCurrentProject = () => {
    const projectToExport = buildProjectSnapshot();
    if (!projectToExport) {
      alert('新規作成または JSON 読み込み後に保存してください。');
      return;
    }
    setCurrentProject(projectToExport);
    const dataStr = JSON.stringify(projectToExport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectToExport.title || 'project'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert('JSONファイルを保存しました。');
  };

  const isValidProject = (obj: any): obj is Project => {
    return obj && typeof obj.id === 'string' && typeof obj.title === 'string' && typeof obj.createdAt === 'string' && typeof obj.updatedAt === 'string' && obj.data && Array.isArray(obj.data.players) && Array.isArray(obj.data.arrows) && Array.isArray(obj.data.texts) && Array.isArray(obj.data.balls);
  };

  const importProjectData = (data: any) => {
    const importedProject = Array.isArray(data)
      ? data.find(item => isValidProject(item)) ?? null
      : isValidProject(data)
        ? data
        : null;

    if (!importedProject) {
      alert('インポートできるプロジェクトデータが見つかりませんでした。');
      return;
    }

    openProject(importedProject);
    alert('JSONファイルを読み込みました。');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result as string);
        importProjectData(imported);
      } catch (error) {
        alert('ファイルの読み込みに失敗しました。JSON形式を確認してください。');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getSelectionKey = (type: SelectedItem['type'], id: string) => `${type}-${id}`;

  const isSelectedItem = (type: SelectedItem['type'], id: string) => {
    return selectedItems.some(item => item.type === type && item.id === id);
  };

  const clearSelection = () => {
    setSelectedItems([]);
    setDragGroupPositions(null);
  };

  const handleSelectItem = (e: Konva.KonvaEventObject<MouseEvent>, type: SelectedItem['type'], id: string) => {
    if (tool !== 'select') return;
    e.cancelBubble = true;

    const isSelected = isSelectedItem(type, id);
    const multi = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
    if (multi) {
      if (isSelected) {
        setSelectedItems(prev => prev.filter(item => !(item.type === type && item.id === id)));
      } else {
        setSelectedItems(prev => [...prev, { type, id }]);
      }
    } else {
      setSelectedItems([{ type, id }]);
    }
  };

  const deleteSelectedItems = () => {
    captureStateSnapshot();
    const selectedKeys = new Set(selectedItems.map(item => getSelectionKey(item.type, item.id)));
    setPlayers(prev => prev.filter(player => !selectedKeys.has(getSelectionKey('player', player.id))));
    setTexts(prev => prev.filter(text => !selectedKeys.has(getSelectionKey('text', text.id))));
    setArrows(prev => prev.filter(arrow => !selectedKeys.has(getSelectionKey('arrow', arrow.id))));
    setBalls(prev => prev.filter(ball => !selectedKeys.has(getSelectionKey('ball', ball.id))));
    setSelectedItems([]);
    setDragGroupPositions(null);
  };

  const updateSelectedTextsStyle = (updates: Partial<Pick<TextData, 'color' | 'fontSize' | 'fontStyle'>>) => {
    const selectedTextIds = new Set(
      selectedItems
        .filter(item => item.type === 'text')
        .map(item => item.id)
    );
    if (selectedTextIds.size === 0) return;

    captureStateSnapshot();
    setTexts(prev => prev.map(text => (
      selectedTextIds.has(text.id) ? { ...text, ...updates } : text
    )));
  };

  const prepareDragGroup = (currentType: SelectedItem['type'], currentId: string, stageX: number, stageY: number) => {
    captureStateSnapshot();
    const selected = isSelectedItem(currentType, currentId) ? selectedItems : [{ type: currentType, id: currentId }];
    setSelectedItems(selected);
    const positions: Record<string, any> = {};

    selected.forEach(item => {
      if (item.type === 'player') {
        const player = players.find(p => p.id === item.id);
        if (player) {
          positions[getSelectionKey(item.type, item.id)] = { x: player.x, y: player.y };
        }
      }
      if (item.type === 'text') {
        const text = texts.find(t => t.id === item.id);
        if (text) {
          positions[getSelectionKey(item.type, item.id)] = { x: text.x, y: text.y };
        }
      }
      if (item.type === 'arrow') {
        const arrow = arrows.find(a => a.id === item.id);
        if (arrow) {
          positions[getSelectionKey(item.type, item.id)] = {
            points: [...arrow.points],
            x: stageX,
            y: stageY,
          };
        }
      }
      if (item.type === 'ball') {
        const ball = balls.find(b => b.id === item.id);
        if (ball) {
          positions[getSelectionKey(item.type, item.id)] = { x: ball.x, y: ball.y };
        }
      }
    });

    setDragGroupPositions(positions);
    setDragStartPoint({ x: stageX, y: stageY });
  };

  const handleGroupDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (!dragGroupPositions || !dragStartPoint) return;

    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    const dx = pos.x - dragStartPoint.x;
    const dy = pos.y - dragStartPoint.y;
    const selectedKeys = new Set(selectedItems.map(item => getSelectionKey(item.type, item.id)));

    setPlayers(prev => prev.map(player => {
      if (!selectedKeys.has(getSelectionKey('player', player.id))) return player;
      const origin = dragGroupPositions[getSelectionKey('player', player.id)];
      return origin ? { ...player, x: origin.x + dx, y: origin.y + dy } : player;
    }));

    setTexts(prev => prev.map(text => {
      if (!selectedKeys.has(getSelectionKey('text', text.id))) return text;
      const origin = dragGroupPositions[getSelectionKey('text', text.id)];
      return origin ? { ...text, x: origin.x + dx, y: origin.y + dy } : text;
    }));

    setArrows(prev => prev.map(arrow => {
      if (!selectedKeys.has(getSelectionKey('arrow', arrow.id))) return arrow;
      const origin = dragGroupPositions[getSelectionKey('arrow', arrow.id)];
      if (!origin) return arrow;
      return {
        ...arrow,
        points: origin.points.map((value: number, index: number) => value + (index % 2 === 0 ? dx : dy)),
      };
    }));

    setBalls(prev => prev.map(ball => {
      if (!selectedKeys.has(getSelectionKey('ball', ball.id))) return ball;
      const origin = dragGroupPositions[getSelectionKey('ball', ball.id)];
      return origin ? { ...ball, x: origin.x + dx, y: origin.y + dy } : ball;
    }));
  };

  const handleGroupDragEnd = () => {
    setDragGroupPositions(null);
    setDragStartPoint(null);
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (suppressNextStageClick) {
      setSuppressNextStageClick(false);
      return;
    }

    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (tool === 'select' && e.target === stage) {
      clearSelection();
      return;
    }

    if (tool === 'playerHome' || tool === 'playerAway') {
      captureStateSnapshot();
      const newPlayer: Player = {
        id: `player-${Date.now()}`,
        x: pos.x,
        y: pos.y,
        number: players.length + 1,
        name: `選手${players.length + 1}`,
        color: tool === 'playerHome' ? homeColor : awayColor,
        team: tool === 'playerHome' ? 'home' : 'away',
        isSelected: false,
      };
      setPlayers([...players, newPlayer]);
    } else if (tool === 'ball') {
      captureStateSnapshot();
      const newBall: BallData = {
        id: `ball-${Date.now()}`,
        x: pos.x,
        y: pos.y,
        color: ballColor,
      };
      setBalls([...balls, newBall]);
    } else if (tool === 'text') {
      captureStateSnapshot();
      const textToAdd = textInputValue.trim() || 'テキスト';
      const newText: TextData = {
        id: `text-${Date.now()}`,
        x: pos.x,
        y: pos.y,
        text: textToAdd,
        color: textColor,
        fontSize: textFontSize,
        fontStyle: textBold ? 'bold' : 'normal',
      };
      setTexts([...texts, newText]);
    }
  };

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button !== 0) return;
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    if (tool === 'arrow') {
      setDrawingArrow({ start: pos, end: pos });
      return;
    }

    if (tool !== 'select') return;
    if (e.target.draggable()) return;

    setSelectionBox({
      visible: true,
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      startX: pos.x,
      startY: pos.y,
    });
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    if (drawingArrow.start) {
      setDrawingArrow(prev => prev.start ? { ...prev, end: pos } : prev);
      return;
    }

    if (!selectionBox.visible) return;

    const x = Math.min(selectionBox.startX, pos.x);
    const y = Math.min(selectionBox.startY, pos.y);
    const width = Math.abs(pos.x - selectionBox.startX);
    const height = Math.abs(pos.y - selectionBox.startY);

    setSelectionBox(prev => ({ ...prev, x, y, width, height }));
  };

  const handleStageMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (drawingArrow.start) {
      captureStateSnapshot();
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (pos) {
        const newArrow: ArrowData = {
          id: `arrow-${Date.now()}`,
          points: [drawingArrow.start.x, drawingArrow.start.y, pos.x, pos.y],
          color: arrowColor,
        };
        setArrows([...arrows, newArrow]);
      }
      setDrawingArrow({ start: null, end: null });
      return;
    }

    if (!selectionBox.visible) return;

    const hasDragged = selectionBox.width > 3 || selectionBox.height > 3;
    if (hasDragged) {
      const minX = selectionBox.x;
      const maxX = selectionBox.x + selectionBox.width;
      const minY = selectionBox.y;
      const maxY = selectionBox.y + selectionBox.height;

      const selectedPlayers: SelectedItem[] = players
        .filter(player => player.x >= minX && player.x <= maxX && player.y >= minY && player.y <= maxY)
        .map(player => ({ type: 'player', id: player.id }));

      const selectedBalls: SelectedItem[] = balls
        .filter(ball => ball.x >= minX && ball.x <= maxX && ball.y >= minY && ball.y <= maxY)
        .map(ball => ({ type: 'ball', id: ball.id }));

      setSelectedItems([...selectedPlayers, ...selectedBalls]);
      setDragGroupPositions(null);
      setSuppressNextStageClick(true);
    }

    setSelectionBox({ visible: false, x: 0, y: 0, width: 0, height: 0, startX: 0, startY: 0 });
  };

  const handlePlayerDragEnd = (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    if (!dragGroupPositions) {
      captureStateSnapshot();
      const newX = e.target.x();
      const newY = e.target.y();
      setPlayers(players.map(p => p.id === id ? { ...p, x: newX, y: newY } : p));
    }
    handleGroupDragEnd();
  };

  const handleTextDragEnd = (_id: string) => {
    handleGroupDragEnd();
  };

  const handleArrowDragEnd = (_id: string) => {
    handleGroupDragEnd();
  };

  const handleTextChange = (id: string, newText: string) => {
    captureStateSnapshot();
    setTexts(texts.map(t => t.id === id ? { ...t, text: newText } : t));
  };

  const handlePlayerNameChange = (id: string) => {
    const player = players.find(p => p.id === id);
    if (!player) return;
    const newName = prompt('選手名を入力してください:', player.name);
    if (newName === null) return;
    captureStateSnapshot();
    setPlayers(players.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  const selectedPlayerIds = selectedItems
    .filter(item => item.type === 'player')
    .map(item => item.id);
  const selectedSinglePlayer = selectedPlayerIds.length === 1
    ? players.find(player => player.id === selectedPlayerIds[0]) ?? null
    : null;

  const updateSelectedPlayerNumber = (value: string) => {
    if (!selectedSinglePlayer) return;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    const nextNumber = Math.floor(parsed);
    if (nextNumber < 1) return;
    captureStateSnapshot();
    setPlayers(prev => prev.map(player => (
      player.id === selectedSinglePlayer.id ? { ...player, number: nextNumber } : player
    )));
  };

  const updateSelectedPlayerName = (value: string) => {
    if (!selectedSinglePlayer) return;
    captureStateSnapshot();
    setPlayers(prev => prev.map(player => (
      player.id === selectedSinglePlayer.id ? { ...player, name: value } : player
    )));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '0 36px', boxSizing: 'border-box' }}>
      {page === 'landing' ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '20px 20px 64px', background: '#ffffff', color: '#111111', boxSizing: 'border-box' }}>
          <h1 style={{ marginBottom: '56px', fontSize: '48px', letterSpacing: '0.16em', fontWeight: 800, color: '#111111' }}>FOOTBALL BOARDS</h1>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={createNewProject} style={{ margin: '10px', padding: '16px 34px', background: '#111111', color: '#ffffff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase' }}>新規作成</button>
            <button onClick={() => fileInputRef.current?.click()} style={{ margin: '10px', padding: '16px 34px', background: '#ffffff', color: '#111111', border: '1px solid #cccccc', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase' }}>JSONを開く</button>
          </div>
          <input type="file" accept="application/json" ref={fileInputRef} onChange={handleImportFile} style={{ display: 'none' }} />
        </div>
      ) : page === 'newProject' ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', minHeight: '100vh', padding: '20px 20px 64px', background: '#ffffff', color: '#111111', boxSizing: 'border-box', overflowY: 'auto' }}>
          <div style={{ width: '100%', maxWidth: 1100, background: '#f8fafc', border: '1px solid #d1d5db', borderRadius: '16px', padding: '24px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', letterSpacing: '0.12em' }}>新規プロジェクト作成</div>
                <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '6px' }}>ホーム/アウェイ選手入力</div>
              </div>
              <button onClick={cancelNewProjectForm} style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #d1d5db', background: '#ffffff', color: '#111827', cursor: 'pointer' }}>キャンセル</button>
            </div>
            <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
              <label style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>プロジェクト名</label>
              <input
                type="text"
                value={newProjectForm?.title ?? ''}
                onChange={(e) => updateNewProjectFormTitle(e.target.value)}
                placeholder="プロジェクトタイトルを入力"
                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #d1d5db', background: '#ffffff', color: '#111827', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {['home', 'away'].map(team => {
                const playersKey = team === 'home' ? 'homePlayers' : 'awayPlayers';
                const title = team === 'home' ? 'ホーム' : 'アウェイ';
                return (
                  <div key={team} style={{ width: '100%', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '16px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: '#111827' }}>{title}選手 ({newProjectForm?.[playersKey].length ?? 0}名)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 200px', gap: '12px', padding: '8px 0', borderBottom: '1px solid #e5e7eb', fontSize: '12px', color: '#6b7280' }}>
                      <div>背番号</div>
                      <div>名前</div>
                      <div>種別</div>
                    </div>
                    {newProjectForm?.[playersKey].map(player => (
                      <div key={player.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 200px', gap: '12px', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <input
                          type="number"
                          min={1}
                          value={player.number}
                          onChange={(e) => updateNewProjectFormPlayer(team, player.id, 'number', e.target.value)}
                          style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #d1d5db', background: '#f9fafb', color: '#111827' }}
                        />
                        <input
                          type="text"
                          value={player.name}
                          onChange={(e) => updateNewProjectFormPlayer(team, player.id, 'name', e.target.value)}
                          style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #d1d5db', background: '#f9fafb', color: '#111827' }}
                        />
                        <div style={{ color: '#6b7280' }}>{player.role}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
              <button onClick={cancelNewProjectForm} style={{ padding: '12px 18px', borderRadius: '10px', border: '1px solid #d1d5db', background: '#ffffff', color: '#111827', cursor: 'pointer' }}>キャンセル</button>
              <button onClick={submitNewProjectForm} style={{ padding: '12px 18px', borderRadius: '10px', border: 'none', background: '#111827', color: '#ffffff', cursor: 'pointer' }}>作成</button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flex: 1, minHeight: '100vh' }}>
          <div style={{ width: 260, flex: '0 0 260px', display: 'flex', flexDirection: 'column', gap: '10px', margin: '0' }}>
          <aside style={{ width: 260, background: '#141414', color: '#fff', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '100%' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#9fa2ae', letterSpacing: '0.12em' }}>PROJECT</div>
              <div style={{ marginTop: '10px', fontSize: '20px', fontWeight: 700 }}>{projectTitle || '無題のプロジェクト'}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button onClick={() => setSidebarTab('tools')} style={{ width: '100%', padding: '8px', border: 'none', borderRadius: '8px', background: sidebarTab === 'tools' ? '#4a4a4a' : '#1f1f1f', color: '#fff', cursor: 'pointer' }}>操作</button>
              <button onClick={() => setSidebarTab('text')} style={{ width: '100%', padding: '8px', border: 'none', borderRadius: '8px', background: sidebarTab === 'text' ? '#4a4a4a' : '#1f1f1f', color: '#fff', cursor: 'pointer' }}>文字</button>
              <button onClick={() => setSidebarTab('colors')} style={{ width: '100%', padding: '8px', border: 'none', borderRadius: '8px', background: sidebarTab === 'colors' ? '#4a4a4a' : '#1f1f1f', color: '#fff', cursor: 'pointer' }}>色</button>
              <button onClick={() => setSidebarTab('file')} style={{ width: '100%', padding: '8px', border: 'none', borderRadius: '8px', background: sidebarTab === 'file' ? '#4a4a4a' : '#1f1f1f', color: '#fff', cursor: 'pointer' }}>ファイル</button>
            </div>

            {sidebarTab === 'tools' && (
              <div style={{ display: 'grid', gap: '8px' }}>
                <button onClick={() => setTool('select')} style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '10px', background: tool === 'select' ? '#4a4a4a' : '#1f1f1f', color: '#fff', cursor: 'pointer', textAlign: 'left' }}>選択</button>
                <button onClick={() => setTool('playerHome')} style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '10px', background: tool === 'playerHome' ? '#4a4a4a' : '#1f1f1f', color: '#fff', cursor: 'pointer', textAlign: 'left' }}>ホーム選手追加</button>
                <button onClick={() => setTool('playerAway')} style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '10px', background: tool === 'playerAway' ? '#4a4a4a' : '#1f1f1f', color: '#fff', cursor: 'pointer', textAlign: 'left' }}>アウェイ選手追加</button>
                <button onClick={() => setTool('ball')} style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '10px', background: tool === 'ball' ? '#4a4a4a' : '#1f1f1f', color: '#fff', cursor: 'pointer', textAlign: 'left' }}>ボール追加</button>
                <button onClick={() => setTool('arrow')} style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '10px', background: tool === 'arrow' ? '#4a4a4a' : '#1f1f1f', color: '#fff', cursor: 'pointer', textAlign: 'left' }}>矢印追加</button>
                <button onClick={() => setTool('text')} style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '10px', background: tool === 'text' ? '#4a4a4a' : '#1f1f1f', color: '#fff', cursor: 'pointer', textAlign: 'left' }}>文字追加</button>
                <button onClick={undoLastAction} disabled={!previousState} style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '10px', background: previousState ? '#1976d2' : '#4a4a4a', color: '#fff', cursor: previousState ? 'pointer' : 'not-allowed', textAlign: 'left' }}>戻る</button>
                {selectedSinglePlayer && (
                  <div style={{ display: 'grid', gap: '6px', marginTop: '8px', padding: '10px', borderRadius: '10px', background: '#1f1f1f', border: '1px solid #333333' }}>
                    <div style={{ fontSize: '12px', color: '#d1d5db' }}>選択中の選手を編集</div>
                    <label htmlFor="player-number-input" style={{ color: '#d1d5db', fontSize: '12px' }}>背番号</label>
                    <input
                      id="player-number-input"
                      type="number"
                      min={1}
                      value={selectedSinglePlayer.number}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => updateSelectedPlayerNumber(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #3a3a3a', background: '#141414', color: '#ffffff' }}
                    />
                    <label htmlFor="player-name-input" style={{ color: '#d1d5db', fontSize: '12px' }}>選手名</label>
                    <input
                      id="player-name-input"
                      type="text"
                      value={selectedSinglePlayer.name}
                      onChange={(e) => updateSelectedPlayerName(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #3a3a3a', background: '#141414', color: '#ffffff' }}
                    />
                  </div>
                )}
                <button onClick={deleteSelectedItems} disabled={selectedItems.length === 0} style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '10px', background: selectedItems.length > 0 ? '#ff8f00' : '#9e9e9e', color: '#fff', cursor: selectedItems.length > 0 ? 'pointer' : 'not-allowed', marginTop: '12px' }}>
                  選択項目を削除
                </button>
              </div>
            )}

            {sidebarTab === 'text' && (
              <div style={{ display: 'grid', gap: '8px' }}>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label htmlFor="text-input-box" style={{ color: '#d1d5db', fontSize: '12px' }}>追加テキスト</label>
                  <input
                    id="text-input-box"
                    type="text"
                    value={textInputValue}
                    onChange={(e) => setTextInputValue(e.target.value)}
                    onFocus={() => setTool('text')}
                    placeholder="入力後、ピッチをクリック"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #3a3a3a', background: '#1f1f1f', color: '#ffffff', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label htmlFor="text-font-size" style={{ color: '#d1d5db', fontSize: '12px' }}>文字サイズ</label>
                  <input
                    id="text-font-size"
                    type="number"
                    min={8}
                    max={72}
                    value={textFontSize}
                    onChange={(e) => {
                      const nextSize = Math.max(8, Math.min(72, Number(e.target.value) || 16));
                      setTextFontSize(nextSize);
                      updateSelectedTextsStyle({ fontSize: nextSize });
                    }}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #3a3a3a', background: '#1f1f1f', color: '#ffffff', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label htmlFor="text-color" style={{ color: '#d1d5db', fontSize: '12px' }}>文字色</label>
                  <input
                    id="text-color"
                    type="color"
                    value={textColor}
                    onChange={(e) => {
                      const color = e.target.value;
                      setTextColor(color);
                      updateSelectedTextsStyle({ color });
                    }}
                    style={{ width: '100%', height: '42px', border: 'none', borderRadius: '8px', padding: 0, cursor: 'pointer' }}
                  />
                </div>
                <button
                  onClick={() => {
                    const nextBold = !textBold;
                    setTextBold(nextBold);
                    updateSelectedTextsStyle({ fontStyle: nextBold ? 'bold' : 'normal' });
                  }}
                  style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '10px', background: textBold ? '#616161' : '#2a2a2a', color: '#fff', cursor: 'pointer', textAlign: 'left' }}
                >
                  太字: {textBold ? 'ON' : 'OFF'}
                </button>
              </div>
            )}

            {sidebarTab === 'colors' && (
              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#fff', fontSize: '14px' }}>ホーム色</span>
                  <input type="color" value={homeColor} onChange={(e) => {
                    const color = e.target.value;
                    setHomeColor(color);
                    setPlayers(prev => prev.map(player => player.team === 'home' ? { ...player, color } : player));
                  }} style={{ width: '42px', height: '42px', border: 'none', padding: 0, cursor: 'pointer' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#fff', fontSize: '14px' }}>アウェイ色</span>
                  <input type="color" value={awayColor} onChange={(e) => {
                    const color = e.target.value;
                    setAwayColor(color);
                    setPlayers(prev => prev.map(player => player.team === 'away' ? { ...player, color } : player));
                  }} style={{ width: '42px', height: '42px', border: 'none', padding: 0, cursor: 'pointer' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#fff', fontSize: '14px' }}>ボール色</span>
                  <input type="color" value={ballColor} onChange={(e) => {
                    const color = e.target.value;
                    setBallColor(color);
                    setBalls(prev => prev.map(ball => ({ ...ball, color })));
                  }} style={{ width: '42px', height: '42px', border: 'none', padding: 0, cursor: 'pointer' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#fff', fontSize: '14px' }}>矢印色</span>
                  <input
                    type="color"
                    value={arrowColor}
                    onChange={(e) => setArrowColor(e.target.value)}
                    style={{ width: '42px', height: '42px', border: 'none', padding: 0, cursor: 'pointer' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#fff', fontSize: '14px' }}>コート色</span>
                  <input
                    type="color"
                    value={pitchColor}
                    onChange={(e) => setPitchColor(e.target.value)}
                    style={{ width: '42px', height: '42px', border: 'none', padding: 0, cursor: 'pointer' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#fff', fontSize: '14px' }}>線色</span>
                  <input
                    type="color"
                    value={lineColor}
                    onChange={(e) => setLineColor(e.target.value)}
                    style={{ width: '42px', height: '42px', border: 'none', padding: 0, cursor: 'pointer' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#fff', fontSize: '14px' }}>背番号色</span>
                  <input
                    type="color"
                    value={playerNumberColor}
                    onChange={(e) => setPlayerNumberColor(e.target.value)}
                    style={{ width: '42px', height: '42px', border: 'none', padding: 0, cursor: 'pointer' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#fff', fontSize: '14px' }}>選手名色</span>
                  <input
                    type="color"
                    value={playerNameColor}
                    onChange={(e) => setPlayerNameColor(e.target.value)}
                    style={{ width: '42px', height: '42px', border: 'none', padding: 0, cursor: 'pointer' }}
                  />
                </div>
              </div>
            )}

            {sidebarTab === 'file' && (
              <div style={{ display: 'grid', gap: '8px' }}>
                <button onClick={exportCurrentProject} style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '10px', background: '#0077ff', color: '#fff', cursor: 'pointer' }}>JSON保存</button>
                <button onClick={() => fileInputRef.current?.click()} style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '10px', background: '#5c6bc0', color: '#fff', cursor: 'pointer' }}>JSON読込</button>
                <input type="file" accept="application/json" ref={fileInputRef} onChange={handleImportFile} style={{ display: 'none' }} />
                <button onClick={() => { setPlayers([]); setArrows([]); setTexts([]); setBalls([]); setSelectedItems([]); }} style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '10px', background: '#d32f2f', color: '#fff', cursor: 'pointer' }}>クリア</button>
              </div>
            )}
            <div style={{ marginTop: 'auto', fontSize: '12px', color: '#7a7a7a' }}>JSON保存でファイルを書き出し、JSON読込で再編集できます。</div>
          </aside>
          <button onClick={() => { setPage('landing'); setCurrentProject(null); resetEditorState(); }} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#f5f5f5', border: '1px solid #d9d9d9', color: '#111111', cursor: 'pointer' }}>ホームへ戻る</button>
          </div>
          <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 24px 24px 50px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', flex: 1 }}>
              <div style={{ width: '100%', maxWidth: editorPanelWidth }}>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', color: '#333' }}>現在の編集モード</div>
                    <div style={{ marginTop: '6px', fontSize: '18px', fontWeight: 700 }}>
                      {tool === 'select' ? '選択' : tool === 'playerHome' ? 'ホーム選手追加' : tool === 'playerAway' ? 'アウェイ選手追加' : tool === 'ball' ? 'ボール追加' : tool === 'arrow' ? '矢印追加' : '文字追加'}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>作成日時: {currentProject ? new Date(currentProject.createdAt).toLocaleString() : '-'}</div>
                </div>
                <Stage
                  width={stageWidth}
                  height={stageHeight}
                  ref={stageRef}
                  onClick={handleStageClick}
                  onMouseDown={handleStageMouseDown}
                  onMouseMove={handleStageMouseMove}
                  onMouseUp={handleStageMouseUp}
                  style={{ border: '1px solid #cfd8dc', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', background: '#f3f5f8' }}
                >
                  <Layer>
                    <Rect x={0} y={pitchHeight} width={benchWidth} height={benchHeight} fill="#f4f4f4" />
                    <Line points={[0, pitchHeight, benchWidth, pitchHeight]} stroke="#b0b0b0" strokeWidth={2} />
                    <Line points={[0, pitchHeight, 0, stageHeight]} stroke="#b0b0b0" strokeWidth={2} />
                    <Line points={[benchWidth, pitchHeight, benchWidth, stageHeight]} stroke="#b0b0b0" strokeWidth={2} />
                    <Line points={[0, stageHeight, benchWidth, stageHeight]} stroke="#b0b0b0" strokeWidth={2} />
                    <Text x={12} y={pitchHeight + 10} text="控えエリア" fontSize={14} fill="#333333" />
                    <Rect x={0} y={0} width={pitchWidth} height={pitchHeight} fill={pitchColor} />
                    <Line points={[0, 0, pitchWidth, 0, pitchWidth, pitchHeight, 0, pitchHeight, 0, 0]} stroke={lineColor} strokeWidth={4} closed />
                    <Line points={[pitchWidth / 2, 0, pitchWidth / 2, pitchHeight]} stroke={lineColor} strokeWidth={3} />
                    <Circle x={pitchWidth / 2} y={pitchHeight / 2} radius={80} stroke={lineColor} strokeWidth={3} />
                    <Circle x={pitchWidth / 2} y={pitchHeight / 2} radius={4} fill={lineColor} />
                    <Rect
                      x={0}
                      y={(pitchHeight - 320) / 2}
                      width={140}
                      height={320}
                      stroke={lineColor}
                      strokeWidth={3}
                      fillEnabled={false}
                    />
                    <Rect
                      x={pitchWidth - 140}
                      y={(pitchHeight - 320) / 2}
                      width={140}
                      height={320}
                      stroke={lineColor}
                      strokeWidth={3}
                      fillEnabled={false}
                    />
                    <Rect
                      x={0}
                      y={(pitchHeight - 180) / 2}
                      width={70}
                      height={180}
                      stroke={lineColor}
                      strokeWidth={3}
                      fillEnabled={false}
                    />
                    <Rect
                      x={pitchWidth - 70}
                      y={(pitchHeight - 180) / 2}
                      width={70}
                      height={180}
                      stroke={lineColor}
                      strokeWidth={3}
                      fillEnabled={false}
                    />
                    <Circle x={120} y={pitchHeight / 2} radius={4} fill={lineColor} />
                    <Circle x={pitchWidth - 120} y={pitchHeight / 2} radius={4} fill={lineColor} />
                    <Line
                      points={createArcPoints(0, 0, 20, 0, 90)}
                      stroke={lineColor}
                      strokeWidth={3}
                      tension={0}
                    />
                    <Line
                      points={createArcPoints(pitchWidth, 0, 20, 90, 180)}
                      stroke={lineColor}
                      strokeWidth={3}
                      tension={0}
                    />
                    <Line
                      points={createArcPoints(pitchWidth, pitchHeight, 20, 180, 270)}
                      stroke={lineColor}
                      strokeWidth={3}
                      tension={0}
                    />
                    <Line
                      points={createArcPoints(0, pitchHeight, 20, 270, 360)}
                      stroke={lineColor}
                      strokeWidth={3}
                      tension={0}
                    />
                    <Line
                      points={createArcPoints(120, pitchHeight / 2, 60, 290, 70)}
                      stroke={lineColor}
                      strokeWidth={3}
                      tension={0}
                    />
                    <Line
                      points={createArcPoints(pitchWidth - 120, pitchHeight / 2, 60, 110, 250)}
                      stroke={lineColor}
                      strokeWidth={3}
                      tension={0}
                    />
                    {balls.map(ball => (
                      <Group
                        key={ball.id}
                        x={ball.x}
                        y={ball.y}
                        draggable
                        onClick={(e) => handleSelectItem(e, 'ball', ball.id)}
                        onDragStart={(e) => {
                          const stage = e.target.getStage();
                          const pos = stage?.getPointerPosition();
                          prepareDragGroup('ball', ball.id, pos?.x ?? 0, pos?.y ?? 0);
                        }}
                        onDragMove={handleGroupDragMove}
                        onDragEnd={() => handleGroupDragEnd()}
                      >
                        <Text
                          x={-14}
                          y={-16}
                          text="⚽"
                          fontSize={30}
                          listening={false}
                        />
                        {isSelectedItem('ball', ball.id) && (
                          <Circle
                            x={0}
                            y={0}
                            radius={18}
                            stroke="#ffd600"
                            strokeWidth={2}
                          />
                        )}
                      </Group>
                    ))}
                    {players.map(player => (
                      <React.Fragment key={player.id}>
                        <Circle
                          x={player.x}
                          y={player.y}
                          radius={20}
                          fill={player.color}
                          stroke={player.isSelected ? '#d32f2f' : '#ffffff'}
                          strokeWidth={player.isSelected ? 4 : 1.5}
                          draggable
                          onClick={(e) => handleSelectItem(e, 'player', player.id)}
                          onDblClick={(e) => {
                            e.cancelBubble = true;
                            handlePlayerNameChange(player.id);
                          }}
                          onDragStart={(e) => {
                            const stage = e.target.getStage();
                            const pos = stage?.getPointerPosition();
                            prepareDragGroup('player', player.id, pos?.x ?? 0, pos?.y ?? 0);
                          }}
                          onDragMove={handleGroupDragMove}
                          onDragEnd={(e) => handlePlayerDragEnd(player.id, e)}
                        />
                        <Text
                          x={player.x - 20}
                          y={player.y - 20}
                          width={40}
                          height={40}
                          text={player.number.toString()}
                          fontSize={14}
                          fill={playerNumberColor}
                          align="center"
                          verticalAlign="middle"
                          padding={0}
                          listening={false}
                        />
                        <Text
                          x={player.x - 50}
                          y={player.y + 24}
                          width={100}
                          text={player.name}
                          fontSize={12}
                          fill={playerNameColor}
                          align="center"
                          listening={false}
                        />
                      </React.Fragment>
                    ))}
                    {arrows.map(arrow => (
                      <Arrow
                        key={arrow.id}
                        points={arrow.points}
                        pointerLength={10}
                        pointerWidth={10}
                        fill={isSelectedItem('arrow', arrow.id) ? '#ffd600' : arrow.color}
                        stroke={isSelectedItem('arrow', arrow.id) ? '#ffd600' : arrow.color}
                        strokeWidth={isSelectedItem('arrow', arrow.id) ? 4 : 3}
                        draggable
                        onClick={(e) => handleSelectItem(e, 'arrow', arrow.id)}
                        onDragStart={(e) => {
                          const stage = e.target.getStage();
                          const pos = stage?.getPointerPosition();
                          prepareDragGroup('arrow', arrow.id, pos?.x ?? 0, pos?.y ?? 0);
                        }}
                        onDragMove={handleGroupDragMove}
                        onDragEnd={() => handleArrowDragEnd(arrow.id)}
                      />
                    ))}
                    {drawingArrow.start && drawingArrow.end && (
                      <Arrow
                        points={[drawingArrow.start.x, drawingArrow.start.y, drawingArrow.end.x, drawingArrow.end.y]}
                        pointerLength={10}
                        pointerWidth={10}
                        fill={arrowColor}
                        stroke={arrowColor}
                        strokeWidth={3}
                        dash={[10, 6]}
                        listening={false}
                      />
                    )}
                    {texts.map(textData => (
                      <Text
                        key={textData.id}
                        x={textData.x}
                        y={textData.y}
                        text={textData.text}
                        fontSize={textData.fontSize ?? 16}
                        fontStyle={textData.fontStyle ?? 'normal'}
                        fill={textData.color ?? '#000000'}
                        stroke={isSelectedItem('text', textData.id) ? '#ffd600' : undefined}
                        strokeWidth={isSelectedItem('text', textData.id) ? 1 : 0}
                        draggable
                        onClick={(e) => handleSelectItem(e, 'text', textData.id)}
                        onDragStart={(e) => {
                          const stage = e.target.getStage();
                          const pos = stage?.getPointerPosition();
                          prepareDragGroup('text', textData.id, pos?.x ?? 0, pos?.y ?? 0);
                        }}
                        onDragMove={handleGroupDragMove}
                        onDragEnd={() => handleTextDragEnd(textData.id)}
                        onDblClick={(e) => {
                          e.cancelBubble = true;
                          const newText = prompt('新しいテキスト:', textData.text);
                          if (newText !== null) handleTextChange(textData.id, newText);
                        }}
                      />
                    ))}
                    {selectionBox.visible && (
                      <Rect
                        x={selectionBox.x}
                        y={selectionBox.y}
                        width={selectionBox.width}
                        height={selectionBox.height}
                        stroke="#1e88e5"
                        strokeWidth={1}
                        dash={[6, 4]}
                        fill="rgba(30, 136, 229, 0.24)"
                        listening={false}
                      />
                    )}
                  </Layer>
                </Stage>
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
};

export default App;