import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProgressContainerComponent } from './progress-container.component';

describe('ProgressContainerComponent', () => {
  let component: ProgressContainerComponent;
  let fixture: ComponentFixture<ProgressContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressContainerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProgressContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
