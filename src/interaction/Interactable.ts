export interface Interactable {
  id: string;
  name: string;
  promptText: string;
  range: number;
  canInteract(): boolean;
  interact(): void;
}
