import { describe, it, expect, beforeEach } from 'vitest';
import { initEngine, setCell, getCache, clearAllCells } from '../src/engine';

describe('Spreadsheet Engine', () => {
  beforeEach(() => {
    clearAllCells();
  });

  describe('Basic Operations', () => {
    it('evaluates basic arithmetic', () => {
      setCell('A1', '=1+2*3');
      expect(getCache()['A1']).toBe(7);
    });

    it('handles cell references', () => {
      setCell('A1', '10');
      setCell('B1', '=A1*2');
      expect(getCache()['B1']).toBe(20);
    });

    it('updates dependencies when upstream cells change', () => {
      setCell('A1', '5');
      setCell('A2', '=A1+5');
      expect(getCache()['A2']).toBe(10);
      
      setCell('A1', '10');
      expect(getCache()['A2']).toBe(15);
    });
  });

  describe('Functions', () => {
    it('computes SUM function correctly', () => {
      initEngine({
        'A1': '10',
        'A2': '20',
        'A3': '30',
        'A4': '=SUM(A1:A3)'
      });
      expect(getCache()['A4']).toBe(60);
    });

    it('computes COUNT function correctly, ignoring non-numbers', () => {
      initEngine({
        'A1': '10',
        'A2': 'hello',
        'A3': '',
        'A4': '20',
        'A5': '=COUNT(A1:A4)'
      });
      expect(getCache()['A5']).toBe(2);
    });

    it('handles multiple arguments in functions', () => {
      initEngine({
        'A1': '1', 'A2': '2',
        'B1': '3', 'B2': '4',
        'C1': '=SUM(A1:A2, B1:B2, 10)'
      });
      expect(getCache()['C1']).toBe(20);
    });
  });

  describe('Edge Cases and Complex Logic', () => {
    it('handles case insensitivity for functions and references', () => {
      initEngine({
        'A1': '5',
        'A2': '10',
        'B1': '=sum(a1:a2)'
      });
      expect(getCache()['B1']).toBe(15);
    });

    it('handles blank/empty cells as 0 in arithmetic', () => {
      setCell('B1', '=A1+5'); // A1 is empty
      expect(getCache()['B1']).toBe(5);
    });

    it('evaluates complex nested formulas with correct order of operations', () => {
      initEngine({
        'A1': '2', 'A2': '4', 'A3': '6',
        'B1': '1', 'B2': '2',
        'C1': '=(SUM(A1:A3) * COUNT(B1:B2)) / 2'
      });
      // SUM is 12, COUNT is 2 -> (12 * 2) / 2 = 12
      expect(getCache()['C1']).toBe(12);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('detects circular dependencies', () => {
      setCell('A1', '=B1');
      setCell('B1', '=A1');
      expect(getCache()['A1']).toBe('#CIRC!');
      expect(getCache()['B1']).toBe('#CIRC!');
    });

    it('propagates errors to dependent cells', () => {
      initEngine({
        'A1': '=B1',
        'B1': '=A1',
        'C1': '=A1+5'
      });
      expect(getCache()['A1']).toBe('#CIRC!');
      expect(getCache()['C1']).toBe('#CIRC!'); // Any dependent of a circular ref is also unresolved and marked as #CIRC!
    });

    it('recovers from circular dependencies when fixed', () => {
      setCell('A1', '=B1');
      setCell('B1', '=A1');
      expect(getCache()['A1']).toBe('#CIRC!');
      
      setCell('B1', '10');
      expect(getCache()['A1']).toBe(10);
      expect(getCache()['B1']).toBe(10);
    });

    it('handles syntax errors gracefully without crashing', () => {
      setCell('A1', '=1+');
      setCell('A2', '=*');
      setCell('A3', '=()');
      
      expect(getCache()['A1']).toBe('#ERR!');
      expect(getCache()['A2']).toBe('#ERR!');
      expect(getCache()['A3']).toBe('');
      
      // Should still be able to compute valid stuff
      setCell('B1', '5');
      expect(getCache()['B1']).toBe(5);
    });

    it('handles divide by zero or math errors gracefully', () => {
      setCell('A1', '=10/0');
      // In JS 10/0 is Infinity, which is not Number.isFinite(), engine handles this and should return #ERR!
      expect(getCache()['A1']).toBe('#ERR!');
    });
  });
});
