// Trusted test fixtures only. Never load or evaluate submitted source locally.
export const references = {
  'Sum of Two Numbers': (a,b) => a+b,
  'Find Maximum in Array': nums => nums.reduce((largest,value) => value > largest ? value : largest, nums[0]),
  'Reverse a String': text => text.split('').reverse().join(''),
  'Valid Palindrome': text => { const normalized=text.toLowerCase().replace(/[^a-z0-9]/g,''); return normalized === normalized.split('').reverse().join(''); },
  'Contains Duplicate': nums => new Set(nums).size !== nums.length,
  'Two Sum': (nums,target) => { const seen=new Map(); for(let i=0;i<nums.length;i++){ if(seen.has(target-nums[i]))return [seen.get(target-nums[i]),i]; seen.set(nums[i],i); } return []; },
  'Valid Anagram': (s,t) => s.split('').sort().join('') === t.split('').sort().join(''),
  'Binary Search': (nums,target) => { let low=0,high=nums.length-1;while(low<=high){const mid=Math.floor((low+high)/2);if(nums[mid]===target)return mid;if(nums[mid]<target)low=mid+1;else high=mid-1;}return -1; },
};
export const incorrect = {
  'Sum of Two Numbers': (a,b) => a-b,
  'Find Maximum in Array': nums => nums[0],
  'Reverse a String': text => text,
  'Valid Palindrome': text => text === text.split('').reverse().join(''),
  'Contains Duplicate': nums => nums.length > 1,
  'Two Sum': () => [0,1],
  'Valid Anagram': (s,t) => s.length === t.length,
  'Binary Search': () => -1,
};
