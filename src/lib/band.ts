// Practice estimates for complete, original 40-question Academic sets only.
const thresholds = [[39,9],[37,8.5],[35,8],[33,7.5],[30,7],[27,6.5],[23,6],[19,5.5],[15,5],[13,4.5],[10,4],[8,3.5],[6,3],[4,2.5],[3,2],[2,1.5],[1,1],[0,0]] as const;
export function estimateBand(correct:number,total:number){if(total!==40||!Number.isInteger(correct)||correct<0||correct>total)return null;return thresholds.find(([min])=>correct>=min)![1]}
